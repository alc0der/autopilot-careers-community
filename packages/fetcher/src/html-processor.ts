import * as cheerio from 'cheerio';
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";


export function parseArticle(input: string) {
  const $ = cheerio.load(input);

  const $article = $('article');
  $article.siblings().remove();

  const article = $article.parent()

  const articleHTML = article.html()

  return articleHTML;
}
