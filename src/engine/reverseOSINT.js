export function reverseOSINT(data) {
  return data.attributes.filter(a =>
    a.data.join(" ").toLowerCase().includes("tracker")
  );
}
