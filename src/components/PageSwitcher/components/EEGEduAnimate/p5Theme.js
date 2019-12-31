const theme = {
  plain: {
    color: "#333333",
    backgroundColor: "#FFFFFF",
    fontFamily: '"Inconsolata", monospace'
  },
  styles: [
    {
      types: ["function"], //setup() draw() createCanvas()
      style: {
        color: "#2C7BB5",
        fontWeight: "bold"
      }
    },
    {
      types: ["punctuation"], // {} , . ; 
      style: {
        color: "#333333"
      }
    },
    {
      types: ["keyword"], //this., let, const, class, extends
      style: {
        color: "#704F21"
      }
    },
    {
      types: ["string", "char"], // "test"
      style: {
        color: "#58A10B"
      }
    },
    {
      types: ["tag"], //.setup .draw
      style: {
        color: "#2C7BB5"
      }
    },
    {
      types: ["operator"], //=== 
      style: {
        color: "#A67F59"
      }
    },
    {
      types: ["constant", "boolean"], //WEBGL, true, PI, 
      style: {
        color: "#D9318F"
      }
    },
    {
      types: ["comment"], // comment
      style: {
        color: "#A0A0A0"
      }
    },
    {
      types: ["attr-name"], //setup=, draw=
      style: {
        color: "#FFDB58"
      }
    }
  ]
} 
export default theme
