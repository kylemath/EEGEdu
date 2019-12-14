// Function to count by n to something
function customCount(start, end, step = 1) {
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
}

// Average of values in data
function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
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

// Standard deviation of values in values
export function standardDeviation(values){
  var avg = average(values);
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);
  var stdDev = Math.sqrt(avgSquareDiff).toFixed(0);
  return stdDev;
}
