// Custom API template extending HTTP template
export const customApiTemplate = {
  extends: 'http',
  debugData: (context, result, error, parentData) => ({
    ...parentData,
    customApi: {
      requestId: context.requestId || 'unknown',
      userAgent: context.userAgent || 'unknown',
      apiVersion: context.apiVersion || 'v1',
      customMetrics: {
        responseSize: result ? JSON.stringify(result).length : 0,
        success: !error,
        timestamp: new Date().toISOString()
      }
    }
  }),
  cache: {
    key: (ctx) => `custom-api:${ctx.apiVersion}:${ctx.url}:${ctx.method}`,
    ttl: 600000, // 10 minutes
    shouldCache: (result, ctx) => ctx.method === 'GET' && result?.status < 400
  },
  log: {
    enabled: true,
    level: 'info',
    format: (entry) => `[CUSTOM-API] ${entry.data.customApi?.apiVersion} ${entry.data.request?.method} ${entry.data.request?.url} - ${entry.status} (${entry.duration_ms}ms)`
  }
};

// E-commerce specific template
export const ecommerceTemplate = {
  extends: 'business',
  debugData: (context, result, error, parentData) => ({
    ...parentData,
    ecommerce: {
      orderId: context.orderId,
      customerId: context.customerId,
      amount: context.amount,
      currency: context.currency || 'USD',
      paymentMethod: context.paymentMethod,
      shippingMethod: context.shippingMethod,
      metrics: {
        processingTime: parentData?.duration_ms,
        success: !error,
        errorType: error?.type || null
      }
    }
  }),
  cache: {
    enabled: false // E-commerce operations shouldn't be cached
  },
  log: {
    enabled: true,
    level: 'info',
    format: (entry) => `[ECOMMERCE] Order ${entry.data.ecommerce?.orderId} - ${entry.status} (${entry.duration_ms}ms)`
  }
};
