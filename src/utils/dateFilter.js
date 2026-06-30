function buildDateFilter(startDate, endDate) {
  const filter = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { gte: start, lte: end };
  }

  if (startDate && !endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(startDate);
    end.setHours(23, 59, 59, 999);

    return { gte: start, lte: end };
  }

  if (!startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { lte: end };
  }

  return filter;
}

module.exports = { buildDateFilter };