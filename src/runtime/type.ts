
import type { FetchRequest, FetchOptions, FetchError, FetchResponse } from 'ofetch'
interface ResponseMap {
  blob: Blob;
  text: string;
  arrayBuffer: ArrayBuffer;
  stream: ReadableStream<Uint8Array>;
}
declare type ResponseType = keyof ResponseMap | 'json';

export interface OnRequestType {
  request: FetchRequest
  options: FetchOptions
}

export interface OnRequestErrorType {
  request: FetchRequest
  options: FetchOptions
  error: FetchError
}

export interface OnResponseType {
  request: FetchRequest
  options: FetchOptions
  response: FetchResponse<any>
}

export interface OnResponseErrorType {
  request: FetchRequest
  options: FetchOptions
  response: FetchResponse<any>
}

export type HTTPConfig = {
  baseURL?: string
  extraParams?: string[]
  paramsHandler?: (params: FetchOptions['params']) => FetchOptions & HTTPConfig
  offline?: () => void
  onRequest?: ({ request, options }: OnRequestType) => void
  onRequestError?: ({
    request,
    options,
    error
  }: OnRequestErrorType) => void
  onResponse?: ({
    request,
    response,
    options
  }: OnResponseType) => Promise<void> | void
  onResponseError?: ({
    request,
    response,
    options
  }: OnResponseErrorType) => void
}

export interface Interceptors {
  onRequest?: ({ request, options }: OnRequestType) => void,
  onRequestError?: ({
    request,
    options,
    error
  }: OnRequestErrorType) => void,
  onResponse?: ({
    request,
    response,
    options
  }: OnResponseType) => Promise<void> | void,
  onResponseError?: ({
    request,
    response,
    options
  }: OnResponseErrorType) => void
}

export type AjaxConfig = FetchOptions & { extraParams?: string[], offline?: () => void, interceptors: Interceptors }
