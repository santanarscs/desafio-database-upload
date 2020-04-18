// import AppError from '../errors/AppError';
import { getRepository } from 'typeorm';
import Category from '../models/Category';

interface Request {
  title: string;
}
class CreateTransactionService {
  public async execute({ title }: Request): Promise<Category> {
    const categoriesRepository = getRepository(Category);
    const findCategory = await categoriesRepository.findOne({
      where: { title },
    });

    if (findCategory) {
      return findCategory;
    }

    const category = await categoriesRepository.create({ title });
    await categoriesRepository.save(category);
    return category;
  }
}

export default CreateTransactionService;
