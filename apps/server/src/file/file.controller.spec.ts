import { Test, TestingModule } from '@nestjs/testing';
import { FileHttpController } from './file.controller.http';
import { FileService } from './file.service';

describe('FileController', () => {
  let controller: FileHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileHttpController],
      providers: [FileService],
    }).compile();

    controller = module.get<FileHttpController>(FileHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
