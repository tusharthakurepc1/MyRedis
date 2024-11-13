/**
 * RESP: Redis Serialization Protocol
 */
class RESP {
  // Initialize CRLF protocol terminator
  constructor() {
    (this.CR = "\\r"), (this.LF = "\\n"), (this.SP = " ");
    this.CRLF = this.CR + this.LF;
  }

  /**
   * Function responsible for expression to value (i.e. decode)
   */
  deserialize(expression) {
    if (expression.length == 0) {
      return "Invalid Expression";
    }

    // Simple string
    if (expression.charAt(0) === "+") {
      if (expression.endsWith(this.CRLF)) {
        return expression.substring(1, expression.lastIndexOf(this.CRLF));
      }
    }
    // Simple error
    else if (expression.charAt(0) === "-") {
      // Simple error
      if (expression.endsWith(this.CRLF)) {
        return expression.substring(1, expression.lastIndexOf(this.CRLF));
      }
    }
    // Number or Doubles
    else if (expression.charAt(0) === ":" || expression.charAt(0) === ",") {
      if (expression.endsWith(this.CRLF)) {
        return expression.charAt(0) === ":"
          ? Number.parseInt(
              expression.substring(1, expression.lastIndexOf(this.CRLF))
            )
          : Number.parseFloat(
              expression.substring(1, expression.lastIndexOf(this.CRLF))
            );
      }
    }
    // Bulk string
    else if (expression.charAt(0) === "$") {
      const expressionToken = expression.substring(1).split(this.CRLF);
      const tokenLength = expressionToken[1].length;
      if (Number(expressionToken[0]) === tokenLength) {
        return String(expressionToken[1]);
      } else if (Number(expressionToken[0]) < 0) {
        return null;
      }
    }
    // Null
    else if (expression.charAt(0) === "_") {
      if (expression.endsWith(this.CRLF)) {
        return null;
      }
    }
    // Boolean
    else if (expression.charAt(0) === "#") {
      if (expression.endsWith(this.CRLF)) {
        return expression.charAt(1) === "t" ? true : false;
      }
    }
    // Map
    else if (expression.charAt(0) === "%") {
      const resultantMap = {};
      const startedArrayIndex = expression.indexOf(this.CRLF);
      const expressionToken = expression
        .substring(startedArrayIndex + 4)
        .split(this.CRLF);
      let mapLength = Number(expression.substring(1, startedArrayIndex));

      for (
        let index = 0;
        index < expressionToken.length && mapLength > 0;
        index += 1, mapLength -= 1
      ) {
        const token = expressionToken[index];
        const nextToken = expressionToken[index + 1];

        const key = this.deserialize(
          this.replaceRespConstants(token + this.CRLF)
        );
        const value = this.deserialize(
          this.replaceRespConstants(nextToken + this.CRLF)
        );

        resultantMap[key] = value;
        index += 1;
      }

      return resultantMap;
    }
    // Array
    else if (expression.charAt(0) === "*") {
      const expressionTokens = expression.split(this.CRLF);
      const response = this.deserializeArray(expressionTokens, 0);
      return response.resultantArray || [];
    }

    return "";
  }

  /**
   * Recursive solution to deserialize array (i.e. decode)
   */
  deserializeArray(expressionTokens, index) {
    // Base case
    if (index >= expressionTokens.length) {
      return;
    }
    const token = expressionTokens[index];

    // Recursive call to base deserialization function (i.e. Base Case)
    if (["+", "-", "_", ":", ",", "#"].includes(token.charAt(0))) {
      return this.deserialize(this.replaceRespConstants(token + this.CRLF));
    }
    // Recursive call to handle base deserialization function (i.e Base Case)
    else if (["$"].includes(token.charAt(0))) {
      const nextToken = expressionTokens[index + 1];
      return {
        resultantArray: this.deserialize(this.searialize(nextToken)),
        length: 1,
      };
    }
    // Traverse all array element
    else if (token.charAt(0) === "*") {
      const resultantArray = [];
      let arrayLength = Number(token.substring(1));

      // Length of all the nested element count need to skip while traversal
      let nestedLengthCount = 0;

      for (let i = 1; i <= arrayLength; i++) {
        const reccSol = this.deserializeArray(expressionTokens, index + i);
        // Recursive solution contain the nested array and having count of all the nested array element
        if (typeof reccSol === "object") {
          resultantArray.push(reccSol.resultantArray);
          arrayLength += reccSol.length;
          i += reccSol.length;
          nestedLengthCount += reccSol.length;
        }
        // Having the base case solution so directly push
        else {
          resultantArray.push(reccSol);
        }
      }

      // return in case of nested array element having count of all the nested element count
      return {
        resultantArray,
        length: resultantArray.length + nestedLengthCount,
      };
    }
  }

  /**
   * Function responsible for value to expression (i.e. encode)
   */
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

  /**
   * Helper function help to convert the escape sequence to crlf protocol terminator
   */
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
