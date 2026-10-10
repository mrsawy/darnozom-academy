import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { PaginateModel, PaginateResult, RootFilterQuery } from 'mongoose';
import { ActiveStatus, ApprovalStatus, CategoryErrors, PublishStatus } from '@lms-organization/shared-types';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { CategoryWithChildren } from '../utils/types/CategoryWithChildren';
import { PaginateOptionsWithSearch } from '../utils/types/PaginateOptionsWithSearch';
import { applyUpdateWithApproval, buildApprovedFilter, escapeRegex } from '../utils/approval.utils';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { NOT_DELETED_FILTER, buildSoftDeleteSet, withNotDeletedFilter } from 'src/utils/soft-delete';

/**
 * Builds a nested tree from a flat descendants array.
 * Serialized and executed inside MongoDB's $function stage — must remain pure.
 */
function buildTreeFn(descendants: unknown[], rootId: unknown) {
  interface CategoryItem {
    _id: unknown;
    name: string;
    description: string;
    organizationId: unknown;
    parentId: unknown;
    approvalStatus: unknown;
    approvalComment: unknown;
    pendingUpdate: unknown;
    coursesCount: unknown;
    instructorsCount: unknown;
    createdAt: unknown;
    updatedAt: unknown;
    childCategories: CategoryItem[];
  }
  const itemMap: Record<string, CategoryItem> = {};
  for (const item of descendants as CategoryItem[]) {
    const itemId = String((item._id as { valueOf: () => unknown }).valueOf());
    itemMap[itemId] = {
      _id: item._id,
      name: item.name,
      description: item.description,
      organizationId: item.organizationId,
      parentId: item.parentId,
      approvalStatus: item.approvalStatus,
      approvalComment: item.approvalComment,
      pendingUpdate: item.pendingUpdate,
      coursesCount: item.coursesCount,
      instructorsCount: item.instructorsCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      childCategories: [],
    };
  }

  const directChildren: CategoryItem[] = [];
  const rootIdValue = String((rootId as { valueOf: () => unknown }).valueOf());
  for (const id in itemMap) {
    const item2 = itemMap[id];
    if (item2.parentId) {
      const parentIdValue = String((item2.parentId as { valueOf: () => unknown }).valueOf());
      if (parentIdValue === rootIdValue) {
        directChildren.push(item2);
      } else {
        const parent = itemMap[parentIdValue];
        if (parent) {
          parent.childCategories.push(item2);
        }
      }
    }
  }

  return directChildren;
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: PaginateModel<Category>
  ) {}

  async create(createCategoryDto: CreateCategoryDto & { organizationId: string }) {
    if (createCategoryDto.parentId) {
      const parent = await this.categoryModel
        .findOne({
          _id: convertObjectValuesToObjectId(createCategoryDto.parentId),
          organizationId: convertObjectValuesToObjectId(createCategoryDto.organizationId),
        })
        .exec();
      if (!parent) {
        throw new BadRequestException('Parent category does not exist in this organization');
      }
    }

    const created = new this.categoryModel({
      ...createCategoryDto,
      approvalStatus: ApprovalStatus.PENDING,
      publishStatus: PublishStatus.PUBLISHED,
    });
    return created.save();
  }

  async getAllFlat(options: PaginateOptionsWithSearch, organizationId?: string, approvedOnly = false) {
    const filters: RootFilterQuery<Category> = withNotDeletedFilter({
      publishStatus: PublishStatus.PUBLISHED,
      activeStatus: ActiveStatus.ACTIVE,
    });
    if (organizationId) {
      filters.organizationId = organizationId;
    }
    if (approvedOnly) {
      Object.assign(filters, buildApprovedFilter());
    }
    if (options.search) {
      const escaped = escapeRegex(options.search);
      filters.$or = [{ name: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
    }
    return await this.categoryModel.paginate(filters, options);
  }

  async getOneApproved(id: string) {
    const category = await this.categoryModel
      .findOne(
        withNotDeletedFilter({
          _id: convertObjectValuesToObjectId(id),
          approvalStatus: ApprovalStatus.APPROVED,
          publishStatus: PublishStatus.PUBLISHED,
          activeStatus: ActiveStatus.ACTIVE,
        })
      )
      .select('name description coursesCount instructorsCount organizationId')
      .exec();
    if (!category) {
      throw new NotFoundException(`Approved category with id ${id} not found`);
    }
    return category;
  }

  async getAllApprovedFlat(options: PaginateOptionsWithSearch) {
    const filters: RootFilterQuery<Category> = withNotDeletedFilter({
      approvalStatus: ApprovalStatus.APPROVED,
      publishStatus: PublishStatus.PUBLISHED,
      activeStatus: ActiveStatus.ACTIVE,
    });
    if (options.search) {
      const escaped = escapeRegex(options.search);
      filters.$or = [{ name: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
    }
    return await this.categoryModel.paginate(filters, {
      ...options,
      select: 'name description organizationId coursesCount instructorsCount',
    });
  }

  async getAllWithAggregation(
    options: PaginateOptionsWithSearch,
    organizationId?: string,
    parentId?: string | mongoose.Types.ObjectId | null
  ): Promise<PaginateResult<CategoryWithChildren>> {
    const limit = options.limit ?? 10;
    const page = options.page ?? 1;
    const orgObjectId = organizationId ? new this.categoryModel.base.Types.ObjectId(organizationId) : undefined;

    // Stages that are shared between both paths: graphLookup descendants → build tree → clean up
    const treeStages: mongoose.PipelineStage[] = [
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'allDescendants',
          depthField: 'level',
          restrictSearchWithMatch: NOT_DELETED_FILTER,
        },
      },
      {
        $addFields: {
          childCategories: {
            $function: {
              body: buildTreeFn,
              args: ['$allDescendants', '$_id'],
              lang: 'js',
            },
          },
        },
      },
      { $project: { allDescendants: 0 } },
    ];

    // --- Search path ---
    // Walk UP from every matching node to its root so the full parent tree is returned.
    const searchTrimmed = options.search?.trim();
    if (searchTrimmed && orgObjectId) {
      const escaped = escapeRegex(searchTrimmed);
      const searchFilter: RootFilterQuery<Category> = withNotDeletedFilter({
        organizationId: orgObjectId,
        publishStatus: PublishStatus.PUBLISHED,
        activeStatus: ActiveStatus.ACTIVE,
        $or: [{ name: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }],
      });

      // Step 1 – find unique root IDs whose subtree contains at least one match.
      const rootIdsPipeline: mongoose.PipelineStage[] = [
        { $match: searchFilter },
        {
          $graphLookup: {
            from: 'categories',
            startWith: '$parentId',
            connectFromField: 'parentId',
            connectToField: '_id',
            as: 'ancestors',
            restrictSearchWithMatch: NOT_DELETED_FILTER,
          },
        },
        {
          $project: {
            rootId: {
              $cond: [
                { $eq: [{ $size: '$ancestors' }, 0] },
                '$_id',
                {
                  $let: {
                    vars: {
                      root: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$ancestors',
                              as: 'a',
                              cond: { $eq: ['$$a.parentId', null] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: '$$root._id',
                  },
                },
              ],
            },
          },
        },
        { $group: { _id: '$rootId' } },
      ];

      const rootResults = await this.categoryModel.aggregate<{ _id: mongoose.Types.ObjectId }>(rootIdsPipeline);
      const allRootIds = rootResults.map((r) => r._id).toSorted((a, b) => String(a).localeCompare(String(b)));
      const totalCount = allRootIds.length;

      if (totalCount === 0) {
        return {
          docs: [],
          totalDocs: 0,
          limit,
          page,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
          pagingCounter: 1,
          offset: 0,
        };
      }

      // Step 2 – paginate root IDs, then build full trees for the current page.
      const paginatedRootIds = allRootIds.slice((page - 1) * limit, page * limit);
      const results = await this.categoryModel.aggregate<CategoryWithChildren>([
        { $match: { _id: { $in: paginatedRootIds }, organizationId: orgObjectId } },
        {
          $addFields: {
            __sortOrder: { $indexOfArray: [paginatedRootIds, '$_id'] },
          },
        },
        { $sort: { __sortOrder: 1 } },
        ...treeStages,
        { $project: { __sortOrder: 0 } },
      ]);

      return {
        docs: results,
        totalDocs: totalCount,
        limit,
        page,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
        nextPage: page * limit < totalCount ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        pagingCounter: (page - 1) * limit + 1,
        offset: (page - 1) * limit,
      };
    }

    // --- Default path (no search) ---
    const match: RootFilterQuery<Category> = withNotDeletedFilter({
      publishStatus: PublishStatus.PUBLISHED,
      activeStatus: ActiveStatus.ACTIVE,
    });
    if (parentId !== undefined) match.parentId = parentId;
    if (orgObjectId) match.organizationId = orgObjectId;

    const pipeline: mongoose.PipelineStage[] = [{ $match: match }, { $skip: (page - 1) * limit }, { $limit: limit }, ...treeStages];

    const [results, totalCount] = await Promise.all([
      this.categoryModel.aggregate<CategoryWithChildren>(pipeline),
      this.categoryModel.countDocuments(match),
    ]);

    return {
      docs: results,
      totalDocs: totalCount,
      limit,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
      nextPage: page * limit < totalCount ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      pagingCounter: (page - 1) * limit + 1,
      offset: (page - 1) * limit,
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, organizationId: string) {
    const category = await this.categoryModel
      .findOne({
        _id: new this.categoryModel.base.Types.ObjectId(id),
        organizationId: new this.categoryModel.base.Types.ObjectId(organizationId),
      })
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found in your organization`);
    }

    if (category.approvalStatus === ApprovalStatus.APPROVED || category.approvalStatus === ApprovalStatus.PENDING_UPDATE) {
      throw new ForbiddenException(CategoryErrors.CATEGORY_APPROVED_CANNOT_UPDATE);
    }

    if (updateCategoryDto.parentId) {
      const parent = await this.categoryModel
        .findOne({
          _id: new this.categoryModel.base.Types.ObjectId(updateCategoryDto.parentId),
          organizationId: new this.categoryModel.base.Types.ObjectId(organizationId),
        })
        .exec();
      if (!parent) {
        throw new BadRequestException('Parent category does not exist in this organization');
      }
    }

    const { authorization, organizationId: _orgId, ...changes } = updateCategoryDto;
    applyUpdateWithApproval(category, changes as Record<string, unknown>);

    return category.save();
  }

  async delete(id: string, organizationId: string, deletedById?: string | mongoose.Types.ObjectId | null) {
    const category = await this.categoryModel
      .findOne(
        withNotDeletedFilter({
          _id: new this.categoryModel.base.Types.ObjectId(id),
          organizationId: new this.categoryModel.base.Types.ObjectId(organizationId),
        })
      )
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found in your organization`);
    }

    if (category.approvalStatus === ApprovalStatus.APPROVED || category.approvalStatus === ApprovalStatus.PENDING_UPDATE) {
      throw new ForbiddenException(CategoryErrors.CATEGORY_APPROVED_CANNOT_DELETE);
    }

    await this.categoryModel.updateOne(withNotDeletedFilter({ _id: category._id }), {
      $set: buildSoftDeleteSet(deletedById),
    });
    return { success: true, deletedId: id };
  }

  async getCategoryWithRelations(organizationId: string, categoryId: string) {
    const pipeline = [
      {
        $match: withNotDeletedFilter({
          _id: new this.categoryModel.base.Types.ObjectId(categoryId),
          organizationId: new this.categoryModel.base.Types.ObjectId(organizationId),
          publishStatus: PublishStatus.PUBLISHED,
          activeStatus: ActiveStatus.ACTIVE,
        }),
      },
      {
        $lookup: {
          from: 'categories',
          let: { orgId: '$organizationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$organizationId', '$$orgId'] },
                    { $eq: ['$publishStatus', PublishStatus.PUBLISHED] },
                    { $eq: ['$activeStatus', ActiveStatus.ACTIVE] },
                  ],
                },
                ...NOT_DELETED_FILTER,
              },
            },
          ],
          as: 'allCategories',
        },
      },
      {
        $addFields: {
          childCategories: {
            $function: {
              body: function (allCategories: unknown[], parentId: unknown): CategoryWithChildren[] {
                interface CategoryItem {
                  _id: unknown;
                  name: string;
                  description: string;
                  organizationId: unknown;
                  parentId: unknown;
                  approvalStatus: unknown;
                  approvalComment: unknown;
                  pendingUpdate: unknown;
                  coursesCount: unknown;
                  instructorsCount: unknown;
                  createdAt: unknown;
                  updatedAt: unknown;
                }
                function buildTree(items: CategoryItem[], currentParentId: unknown): CategoryWithChildren[] {
                  let currentParentIdStr: string;
                  if (!currentParentId) {
                    currentParentIdStr = '';
                  } else if (typeof (currentParentId as { valueOf?: () => unknown }).valueOf === 'function') {
                    currentParentIdStr = String((currentParentId as { valueOf: () => unknown }).valueOf());
                  } else {
                    currentParentIdStr = String(currentParentId);
                  }

                  return items
                    .filter((item) => {
                      if (!item.parentId) return false;
                      const parentIdStr =
                        typeof (item.parentId as { valueOf?: () => unknown }).valueOf === 'function'
                          ? String((item.parentId as { valueOf: () => unknown }).valueOf())
                          : String(item.parentId);
                      return parentIdStr === currentParentIdStr;
                    })
                    .map((item) => ({
                      _id: item._id,
                      name: item.name,
                      description: item.description,
                      organizationId: item.organizationId,
                      parentId: item.parentId,
                      approvalStatus: item.approvalStatus,
                      approvalComment: item.approvalComment,
                      pendingUpdate: item.pendingUpdate,
                      coursesCount: item.coursesCount,
                      instructorsCount: item.instructorsCount,
                      createdAt: item.createdAt,
                      updatedAt: item.updatedAt,
                      childCategories: buildTree(items, item._id),
                    })) as unknown as CategoryWithChildren[];
                }
                return buildTree(allCategories as CategoryItem[], parentId);
              },
              args: ['$allCategories', '$_id'],
              lang: 'js',
            },
          },
        },
      },
      {
        $project: {
          allCategories: 0,
        },
      },
    ];

    const result = await this.categoryModel.aggregate<CategoryWithChildren>(pipeline);

    if (!result || result.length === 0) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }

    return result[0];
  }
}
