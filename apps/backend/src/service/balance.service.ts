import { client } from "db/client";

export const getBalance = async (userId: string) => {
  let wallet = await client.wallet.findFirst({
    where: { UserId: userId },
  });

  if (!wallet) {
    wallet = await client.wallet.create({
      data: {
        UserId: userId,
        balance: 1000, // starting balance for testing
        lock: 0,
      },
    });
  }

  return wallet;
};

export const lockBalance = async (userId: string, amount: number) => {
  const wallet = await getBalance(userId);
  if (wallet.balance < amount) {
    throw new Error("Insufficient balance");
  }

  return await client.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: { decrement: amount },
      lock: { increment: amount },
    },
  });
};

export const releaseBalance = async (userId: string, amount: number) => {
  const wallet = await getBalance(userId);
  return await client.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: amount },
      lock: { decrement: amount },
    },
  });
};

export const transferLockedBalance = async (fromUserId: string, toUserId: string, amount: number) => {
  // Transfer amount from 'lock' of fromUser to 'balance' of toUser
  const fromWallet = await getBalance(fromUserId);
  const toWallet = await getBalance(toUserId);

  await client.$transaction([
    client.wallet.update({
      where: { id: fromWallet.id },
      data: { lock: { decrement: amount } },
    }),
    client.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: amount } },
    }),
  ]);
};
