import { getCustomRepository, getRepository, In } from 'typeorm';
import fs from 'fs';
import parse from 'csv-parse';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  file: string;
}
interface ImportCSV {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
interface Request {
  file: string;
}

class ImportTransactionsService {
  async execute({ file }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(file);

    // começa a ler da segunda linha
    const parsers = parse({ from_line: 2 });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: ImportCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => parseCSV.on('end', resolve));

    /**
     * 1. Busca por categories existente passando um array delas
     */
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    /**
     * 1. Retorna um array de strings de categorias
     */
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );
    /**
     * 1. Filtra todas as categories que nao foram encontradas anteriomente
     * 2. Remove as categories que estao duplicadas
     * */
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);
    /**
     * Cria um monde de categorias
     */
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoriesRepository.save(newCategories);
    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(file);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
