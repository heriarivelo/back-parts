export async function generateReference(tx, model, field, prefixCode) {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const datePart = `${yyyy}${mm}${dd}`;
  const prefix = `${prefixCode}-${datePart}-`;

  const lastRecord = await tx[model].findFirst({
    where: {
      [field]: {
        startsWith: prefix,
      },
    },
    orderBy: {
      [field]: "desc",
    },
  });

  const lastNumber = lastRecord?.[field]
    ? Number(lastRecord[field].split("-").pop())
    : 0;

  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}