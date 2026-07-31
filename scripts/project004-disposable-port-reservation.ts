import { createServer, type Server } from "node:net";

export type DisposablePorts = {
  api: number;
  database: number;
  shadow: number;
  pooler: number;
  studio: number;
  mail: number;
  analytics: number;
};

const ownerLocalPorts = new Set([
  3000,
  54320,
  54321,
  54322,
  54323,
  54324,
  54327,
  54329,
]);

function reserveOnePort() {
  return new Promise<{ server: Server; port: number }>(
    (resolve, reject) => {
      const server = createServer();
      server.unref();
      server.once("error", reject);
      server.listen(
        {
          host: "127.0.0.1",
          port: 0,
          exclusive: true,
        },
        () => {
          server.removeListener("error", reject);
          const address = server.address();
          if (!address || typeof address === "string") {
            server.close();
            reject(
              new Error(
                "DISPOSABLE_PORT_RESERVATION_INVALID",
              ),
            );
            return;
          }
          resolve({ server, port: address.port });
        },
      );
    },
  );
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function reserveDisposablePorts() {
  const reservations: Array<{
    server: Server;
    port: number;
  }> = [];
  try {
    while (reservations.length < 7) {
      const reservation = await reserveOnePort();
      if (
        ownerLocalPorts.has(reservation.port) ||
        reservations.some(
          (existing) =>
            existing.port === reservation.port,
        )
      ) {
        await closeServer(reservation.server);
        continue;
      }
      reservations.push(reservation);
    }
  } catch (error) {
    await Promise.allSettled(
      reservations.map((entry) =>
        closeServer(entry.server),
      ),
    );
    throw error;
  }
  const [
    api,
    database,
    shadow,
    pooler,
    studio,
    mail,
    analytics,
  ] = reservations.map((entry) => entry.port);
  if (
    api === undefined ||
    database === undefined ||
    shadow === undefined ||
    pooler === undefined ||
    studio === undefined ||
    mail === undefined ||
    analytics === undefined
  ) {
    await Promise.allSettled(
      reservations.map((entry) =>
        closeServer(entry.server),
      ),
    );
    throw new Error("DISPOSABLE_PORT_RESERVATION_INVALID");
  }
  let released = false;
  return {
    ports: {
      api,
      database,
      shadow,
      pooler,
      studio,
      mail,
      analytics,
    } satisfies DisposablePorts,
    async release() {
      if (released) return;
      released = true;
      await Promise.all(
        reservations.map((entry) =>
          closeServer(entry.server),
        ),
      );
    },
  };
}

export function isOwnerLocalPort(port: number) {
  return ownerLocalPorts.has(port);
}
