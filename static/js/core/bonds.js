function btp_ytmAt(bond, price) {
  if (price == null || !bond.coupon || !bond.mat || bond.special) return null;
  const years =
    (new Date(bond.mat) - new Date()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 0.5) return null;
  return ((bond.coupon + (100 - price) / years) / ((100 + price) / 2)) * 100;
}

function btp_ytm(bond) {
  return btp_ytmAt(bond, bond.price);
}

function btp_netYield(bond, price) {
  const y = btp_ytmAt(bond, price);
  return y != null ? y * 0.875 : null;
}
export { btp_ytmAt, btp_ytm, btp_netYield };
