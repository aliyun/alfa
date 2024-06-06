import { addRequestInterceptor } from '@alicloud/alfa-core'
import { RequestInterceptor } from '@alicloud/alfa-core/types/utils/interceptors'

export default function addGlobalRequestInterceptor(interceptor: RequestInterceptor) {
  addRequestInterceptor(interceptor);
}
