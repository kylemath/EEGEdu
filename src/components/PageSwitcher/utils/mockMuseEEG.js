const { interval, from } = require('rxjs');
const { map, flatMap } = require('rxjs/operators');

const samples = () => {
 return Array(12)
  .fill()
  .map(_ => Math.random()).map(function(x) {return x * 50});
};

const transform = (index) => {
 const timestamp = Date.now();
 return from([0,1,2,3]).pipe(
  map(electrode => ({
   timestamp,
   electrode,
   index,
   samples: samples()
  }))
 )
};

export const mockMuseEEG = (sampleRate) => {
 let index = 0;
 return interval(1000 / sampleRate).pipe(
  map(() => index += 1),
  flatMap(transform),
 )
};
