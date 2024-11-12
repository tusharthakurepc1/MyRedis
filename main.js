class RESP {
  constructor() {
    (this.CR = "\\r"), (this.LF = "\\n"), (this.SP = " ");
    this.CRLF = this.CR + this.LF;
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
    } else if (expression.charAt(0) === ":" || expression.charAt(0) === ",") {
      // number or doubles
      if (expression.endsWith(this.CR + this.LF)) {
        return expression.charAt(0) === ":"
          ? Number.parseInt(
              expression.substring(1, expression.lastIndexOf(this.CR + this.LF))
            )
          : Number.parseFloat(
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
    } else if (expression.charAt(0) === "_") {
      if (expression.endsWith(this.CR + this.LF)) {
        return null;
      }
    } else if (expression.charAt(0) === "#") {
      if (expression.endsWith(this.CR + this.LF)) {
        return expression.charAt(1) === "t" ? true : false;
      }
    } else if (expression.charAt(0) === "*") {
      // TODO: need to rewrite the whole array desearializer
      // array
      let resultantArray = [];
      const startedArrayIndex = expression.indexOf(this.CR + this.LF);
      const expressionTokens = expression
        .substring(startedArrayIndex + 4)
        .split(this.CR + this.LF);

      for (let index = 0; index < expressionTokens.length; index += 1) {
        const token = expressionTokens[index];

        // For nested array element call deserialize itself
        if (token.charAt(0) === ":" || token.charAt(0) === ",") {
          resultantArray.push(
            this.deserialize(
              this.replaceRespConstants(token + this.CR + this.LF)
            )
          );
        } else if (token.charAt(0) === "$") {
          const nextToken = expressionTokens[index + 1];
          resultantArray.push(
            this.deserialize(
              this.replaceRespConstants(
                token + this.CR + this.LF + nextToken + this.CR + this.LF
              )
            )
          );
          const tokenLength = Number(token.substring(1));
          if (tokenLength > 0) index += 1;
        } else if (token.charAt(0) === "+") {
          resultantArray.push(this.deserialize(token + this.CR + this.LF));
        } else if (token.charAt(0) === "-") {
          resultantArray.push(this.deserialize(token + this.CR + this.LF));
        } else if (token.charAt(0) === "_") {
          resultantArray.push(this.deserialize(token + this.CR + this.LF));
        } else if (token.charAt(0) === "#") {
          resultantArray.push(this.deserialize(token + this.CR + this.LF));
        } else if (token.charAt(0) === "*") {
          const nestedArrayLength = Number(token.substring(1));
          let nestedArrayToken = token + this.CR + this.LF;

          for (let index2 = 1; index2 <= nestedArrayLength; index2 += 1) {
            nestedArrayToken +=
              expressionTokens[index + index2] + this.CR + this.LF;
          }

          resultantArray.push(this.deserialize(nestedArrayToken));
          index += nestedArrayLength;
        }
      }

      return resultantArray;
    } else if (expression.charAt(0) === "%") {
      // map
      const resultantMap = {};
      const startedArrayIndex = expression.indexOf(this.CR + this.LF);
      const expressionToken = expression
        .substring(startedArrayIndex + 4)
        .split(this.CR + this.LF);
      let mapLength = Number(expression.substring(1, startedArrayIndex));

      for (
        let index = 0;
        index < expressionToken.length && mapLength > 0;
        index += 1, mapLength -= 1
      ) {
        const token = expressionToken[index];
        const nextToken = expressionToken[index + 1];

        const key = this.deserialize(
          this.replaceRespConstants(token + this.CR + this.LF)
        );
        const value = this.deserialize(
          this.replaceRespConstants(nextToken + this.CR + this.LF)
        );

        resultantMap[key] = value;
        index += 1;
      }

      return resultantMap;
    }

    return "";
  }

  searialize(message) {
    let searializeMsg = "";

    if (message === null || message === undefined) {
      return `_${this.CRLF}`;
    } else if (typeof message === "string") {
      const messageToken = message.split(" ");

      if (messageToken.length == 1) {
        // Simple string
        return `+${message}${this.CRLF}`;
      } else {
        // Bulk string
        return `$${message.length}${this.CRLF}${message}${this.CRLF}`;
      }
    } else if (Number(message) === message) {
      if (message % 1 === 0) return `:${message}${this.CRLF}`;
      else if (message % 1 !== 0) return `,${message}${this.CRLF}`;
    } else if (typeof message === "boolean") {
      return `#${message ? "t" : "f"}${this.CRLF}`;
    } else if (message instanceof Array) {
      // For Array searialization
      searializeMsg = `*${message.length}${this.CRLF}`;

      for (let i = 0; i < message.length; i++) {
        searializeMsg += this.searialize(message[i]);
      }

      return searializeMsg;
    }
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

  const msg = redis.searialize([1, 2, [3, 4, 5, 8, 9, 10, [11]]]);
  console.log(msg);

  console.log(redis.deserialize(redis.replaceRespConstants(msg)));

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
  // console.log(
  //   redis.deserialize(redis.replaceRespConstants(`,1.23\r\n`))
  // );
  // console.log(
  //   redis.deserialize(
  //     redis.replaceRespConstants(
  //       `|1\r\n+key-popularity\r\n%2\r\n$1\r\na\r\n,0.1923\r\n$1\r\nb\r\n,0.0012\r\n`
  //     )
  //   )
  // );
})();
