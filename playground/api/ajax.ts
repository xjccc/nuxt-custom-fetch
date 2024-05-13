import type { FetchOptions } from 'ofetch'
import { CustomFetch } from '#imports'

const ajax = new CustomFetch({
  baseURL: '',
  handler (params = {}) {
    const obj = JSON.stringify(params)
    return { a: obj }
  }
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
export const getArticleListData = (params: FetchOptions['params']) => ajax.get<ArticleInfo>('/Article/GetSubCategorySeriesInfo', {
  key: '',
  query: params,
  baseURL: '/proxy/cms'
}, { pick: ['totalpage'] })
