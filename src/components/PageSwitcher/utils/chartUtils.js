// Function to count by n to something
function customCount(start, end, step = 1) {
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
}

// Chart options
export const numOptions = {
  srate: 256,
  duration: 1024
};

export const bandLabels = ["Delta", "Theta", "Alpha", "Beta", "Gamma"];

// Generate xTics
export function generateXTics() {
  return customCount(
    (1000 / numOptions.srate) * numOptions.duration,
    1000 / numOptions.srate,
    -(1000 / numOptions.srate)
  ).map(function(each_element) {
    return Number(each_element.toFixed(0));
  });
}
