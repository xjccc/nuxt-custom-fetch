import type { FetchOptions } from 'ofetch'

const ajax = new HTTP({
  baseURL: ''
})

interface ArticleList {
  type: number;
  id: number;
  title: string;
  imgsrc: string[];
  publishdatetime: string;
  publishdate: string;
  commentcount: number;
  clickcount: number;
  murl: string;
  categoryid2name: string;
}

export interface ArticleInfo {
  data: ArticleList[];
  totalpage: number;
  totalrecord: number;
  status: number;
  msg: string;
}

// 获取经销商列表
export const getArticleListData = (params: Record<string, unknown>) => ajax.get<ArticleInfo>('/Article/GetSubCategorySeriesInfo', {
  query: params,
  baseURL: 'https://cms-api-test.360che.com'
})
