export const rabbitWrapper = {
  client: {
    assertExchange: jest
      .fn()
      .mockImplementation(
        (exchangeName: string, exchangeType: string, options: any) => {
          console.log(exchangeName, exchangeType, options);
          return Promise.resolve();
        }
      ),
    publish: jest
      .fn()
      .mockImplementation(
        (
          exchange: string,
          routingKey: string,
          content: Buffer,
          options?: unknown,
          callback?: (error: null, ok: Record<string, never>) => void
        ) => {
          if (typeof callback === "function") {
            callback(null, {});
          }

          return true;
        }
      ),
  },
};
