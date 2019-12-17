// Function to count by n to something
function customCount(start, end, step = 1) {
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
}

// Average of values in data
function average(data) {
  return data.reduce(function(sum, value) {
    return sum + value;
  }, 0).length;
}

export const bandLabels = ["Delta", "Theta", "Alpha", "Beta", "Gamma"];

// Generate xTics
export function generateXTics(srate, duration) {
  return customCount(
    (1000 / srate) * duration,
    1000 / srate,
    -(1000 / srate)
  ).map(function(each_element) {
    return Number(each_element.toFixed(0));
  });
}

// Standard deviation of values in values
export function standardDeviation(values) {
  const avg = average(values);
  const squareDiffs = values.map(function(value) {
    const diff = value - avg;
    return diff * diff;
  });

  return Math.sqrt(average(squareDiffs)).toFixed(0);
}
