class RESP {
  constructor() {
    (this.CR = "\\r"), (this.LF = "\\n"), (this.SP = " ");
  }

  deserialize(expression) {
    if (expression.length == 0) {
      return "Invalid Expression";
    }

    if (expression.charAt(0) === "+") {
      // Simple string
      if (expression.endsWith(this.CR + this.LF)) {
        return expression.substring(
          1,
          expression.lastIndexOf(this.CR + this.LF)
        );
      }
    } else if (expression.charAt(0) === "-") {
      // Simple error
      if (expression.endsWith(this.CR + this.LF)) {
        return expression.substring(
          1,
          expression.lastIndexOf(this.CR + this.LF)
        );
      }
    } else if (expression.charAt(0) === ":") {
      // number
      if (expression.endsWith(this.CR + this.LF)) {
        return Number.parseInt(
          expression.substring(1, expression.lastIndexOf(this.CR + this.LF))
        );
      }
    } else if (expression.charAt(0) === "$") {
      // bulk string
      const expressionToken = expression.substring(1).split(this.CR + this.LF);
      const tokenLength = expressionToken[1].length;
      if (Number(expressionToken[0]) === tokenLength) {
        return String(expressionToken[1]);
      } else if (Number(expressionToken[0]) < 0) {
        return null;
      }
    } else if (expression.charAt(0) === "*") {
      // array
      let resultantResult = [];
      let startedArrayIndex = expression.indexOf(this.CR + this.LF);
      const expressionTokens = expression
        .substring(startedArrayIndex + 4)
        .split(this.CR + this.LF);

      for (let index = 0; index < expressionTokens.length; index += 1) {
        const token = expressionTokens[index];

        // For nested array element call deserialize itself
        if (token.charAt(0) === ":") {
          resultantResult.push(
            this.deserialize(
              this.replaceRespConstants(token + this.CR + this.LF)
            )
          );
        } else if (token.charAt(0) === "$") {
          const nextToken = expressionTokens[index + 1];
          resultantResult.push(
            this.deserialize(
              this.replaceRespConstants(
                token + this.CR + this.LF + nextToken + this.CR + this.LF
              )
            )
          );
          const tokenLength = Number(token.substring(1));
          if (tokenLength > 0) index += 1;
        } else if (token.charAt(0) === "+") {
          resultantResult.push(this.deserialize(token + this.CR + this.LF));
        } else if (token.charAt(0) === "-") {
          resultantResult.push(this.deserialize(token + this.CR + this.LF));
        } else if (token.charAt(0) === "*") {
          const nestedArrayLength = Number(token.substring(1));
          let nestedArrayToken = token + this.CR + this.LF;

          for (let index2 = 1; index2 <= nestedArrayLength; index2 += 1) {
            nestedArrayToken +=
              expressionTokens[index + index2] + this.CR + this.LF;
          }

          resultantResult.push(this.deserialize(nestedArrayToken));
          index += nestedArrayLength;
        }
      }

      return resultantResult;
    }

    return "";
  }

  replaceRespConstants(expression) {
    return expression
      .replaceAll("\r", "\\r")
      .replaceAll("\n", "\\n")
      .toString();
  }
}

(() => {
  const redis = new RESP();

  // console.log(redis.deserialize("+OK\\r\\n"));
  // console.log(redis.deserialize("-Error message\\r\\n"));
  // console.log(redis.deserialize(redis.replaceRespConstants(":1000\r\n")));
  // console.log(redis.deserialize(redis.replaceRespConstants("$5\r\nhello\r\n")));

  // console.log(
  //   redis.deserialize(redis.replaceRespConstants(`*2\r\n*3\r\n:1\r\n:2\r\n:3\r\n*2\r\n+Hello\r\n-World\r\n`))
  // );
  // console.log(
  //   redis.deserialize(
  //     redis.replaceRespConstants(`*-1\r\n`)
  //   )
  // );
})();
