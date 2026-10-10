import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OptionsService } from './options.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';

@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Post()
  create(@Body() createOptionDto: CreateOptionDto) {
    return this.optionsService.create(createOptionDto);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Get()
  findAll() {
    return this.optionsService.findAll();
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.optionsService.findOne(id);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOptionDto: UpdateOptionDto) {
    return this.optionsService.update(id, updateOptionDto);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.optionsService.remove(id);
  }
}
