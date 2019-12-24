// Function to count by n to something
export function customCount(start, end, step = 1) {
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

export const bandLabels = ["Delta", "Theta", "Alpha", "Beta", "Gamma"];

// Generate xTics
export function generateXTics(srate, duration, reverse = true) {
  let tics = [];
  if (reverse) {
    tics = customCount(
      (1000 / srate) * duration,
      1000 / srate,
      -(1000 / srate)
    )
  } else {
    tics = customCount(
      1000 / srate, 
      (1000 / srate) * duration, 
      1000/srate
    )
  }
  return (
    tics.map(function(each_element) {
      return Number(each_element.toFixed(0));
    })
  )
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
