// @ts-check
const { RemoteHttpInterceptorOverWS } = require('../third_party/interceptors')

if (process.env.PW_INTERCEPTOR_PORT) {
  console.log('(server.mjs): Applying RemoteHttpInterceptorWS')
  const interceptor = new RemoteHttpInterceptorOverWS({
    port: +process.env.PW_INTERCEPTOR_PORT,
  })
  interceptor.apply()
}
