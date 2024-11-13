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
    } else if (expression.charAt(0) === "*") {
      // array
      const expressionTokens = expression.split(this.CRLF);
      const response = this.deserializeArray(expressionTokens, 0);
      return response.resultantArray || [];
    }

    return "";
  }

  deserializeArray(expressionTokens, index) {
    if (index >= expressionTokens.length) {
      return;
    }
    const token = expressionTokens[index];

    if (["+", "-", "_", ":", ",", "#"].includes(token.charAt(0))) {
      return this.deserialize(this.replaceRespConstants(token + this.CRLF));
    } else if (["$"].includes(token.charAt(0))) {
      const nextToken = expressionTokens[index + 1];
      return {
        resultantArray: this.deserialize(this.searialize(nextToken)),
        length: 1,
      };
    } else if (token.charAt(0) === "*") {
      const resultantArray = [];
      let nestedLength = Number(token.substring(1));
      let nestedLengthCount = 0;

      for (let i = 1; i <= nestedLength; i++) {
        const reccSol = this.deserializeArray(expressionTokens, index + i);
        if (typeof reccSol === "object") {
          resultantArray.push(reccSol.resultantArray);
          nestedLength += reccSol.length;
          i += reccSol.length;
          nestedLengthCount += reccSol.length;
        } else {
          resultantArray.push(reccSol);
        }
      }

      return {
        resultantArray,
        length: resultantArray.length + nestedLengthCount,
      };
    }
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

  const arr = [1, ["hello", [4, "bluk string"]], [true, 7, [12.5, [9, 10]]]];
  console.log(JSON.stringify(arr));
  
  const msg = redis.searialize(arr);
  console.log(msg);

  console.log(
    JSON.stringify(redis.deserialize(redis.replaceRespConstants(msg)))
  );
})();
