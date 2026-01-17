export class PartialJSONProcessor {
    private buffer: string;

    constructor() {
        this.buffer = "";
    }

    public cleanBuffer(): void {
        this.buffer = "";
    }

    public process(delta: string): any {
        this.buffer += delta;

        try {
            return JSON.parse(this.buffer);
        } catch (e) {
            // ignore
        }

        const repairedJson = this.repairJson(this.buffer);
        try {
            return JSON.parse(repairedJson);
        } catch (e) {
            return {};
        }
    }

    private repairJson(jsonStr: string): string {
        jsonStr = jsonStr.trim();
        if (!jsonStr) {
            return "{}";
        }

        const stack: string[] = [];
        let isInsideString = false;
        let escaped = false;
        let lastChar: string | null = null;

        for (const char of jsonStr) {
            if (isInsideString) {
                if (char === '"' && !escaped) {
                    isInsideString = false;
                    lastChar = '"';
                } else if (char === "\\") {
                    escaped = !escaped;
                } else {
                    escaped = false;
                }
            } else {
                if (char === '"') {
                    isInsideString = true;
                    escaped = false;
                } else if (char === "{" || char === "[") {
                    stack.push(char === "{" ? "}" : "]");
                    lastChar = char;
                } else if (char === "}" || char === "]") {
                    if (stack.length > 0 && stack[stack.length - 1] === char) {
                        stack.pop();
                    }
                    lastChar = char;
                } else if (char === ":" || char === ",") {
                    lastChar = char;
                } else if (!" \n\t\r".includes(char)) {
                    lastChar = char;
                }
            }
        }

        if (isInsideString) {
            jsonStr += '"';
            if (stack.length > 0 && stack[stack.length - 1] === '}' && lastChar && '{,'.includes(lastChar)) {
                jsonStr += ': null';
            }
        }

        jsonStr = jsonStr.trimRight(); // Note: trimRight is deprecated but standard in many envs, use trimEnd if available or regex

        // Polyfill trimEnd if needed or just use regex for "remove trailing comma"
        if (jsonStr.endsWith(',')) {
            jsonStr = jsonStr.slice(0, -1);
        }

        if (jsonStr.endsWith(':')) {
            jsonStr += ' null';
        }

        while (stack.length > 0) {
            jsonStr += stack.pop();
        }

        return jsonStr;
    }
}
