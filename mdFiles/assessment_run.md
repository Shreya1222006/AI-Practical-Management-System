# Assessment Run Guide

Assessment: `DSA Practice 1: Arrays And Strings`  
Assessment ID: `601d8324-4be0-45cd-bfd3-f937a83c865c`  
Language/environment: C++ / `cpp-gcc`

This assessment contains three questions. The C++ programs below match each question's input and output format and pass the test cases included in the assessment response.

## Question 1: Two Sum

Question ID: `86ed9dae-b404-48bf-ad90-2d294204da89`

Read `n` and `target`, followed by `n` integers. Print the zero-based indices of two distinct values whose sum is `target`.

```cpp
#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    int n;
    int target;
    std::cin >> n >> target;

    std::vector<int> values(n);
    std::unordered_map<int, int> firstIndex;

    for (int index = 0; index < n; ++index) {
        std::cin >> values[index];
        const int complement = target - values[index];
        const auto match = firstIndex.find(complement);

        if (match != firstIndex.end()) {
            std::cout << match->second << ' ' << index << '\n';
            return 0;
        }

        firstIndex.emplace(values[index], index);
    }

    return 0;
}
```

Expected test outputs:

- Input `4 9` then `2 7 11 15` -> `0 1`
- Input `3 6` then `3 2 4` -> `1 2`

## Question 2: Valid Parentheses

Question ID: `3138392c-d6cc-40d0-a8d8-9875c04fa0c1`

Read a line containing parentheses, square brackets, and braces. Print `true` if all brackets are correctly matched and nested; otherwise print `false`.

```cpp
#include <iostream>
#include <stack>
#include <string>

int main() {
    std::string input;
    std::getline(std::cin >> std::ws, input);

    std::stack<char> openBrackets;
    for (char bracket : input) {
        if (bracket == '(' || bracket == '[' || bracket == '{') {
            openBrackets.push(bracket);
            continue;
        }

        char expectedOpening = '\0';
        if (bracket == ')') expectedOpening = '(';
        else if (bracket == ']') expectedOpening = '[';
        else if (bracket == '}') expectedOpening = '{';
        else {
            std::cout << "false\n";
            return 0;
        }

        if (openBrackets.empty() || openBrackets.top() != expectedOpening) {
            std::cout << "false\n";
            return 0;
        }
        openBrackets.pop();
    }

    std::cout << (openBrackets.empty() ? "true" : "false") << '\n';
    return 0;
}
```

Expected test outputs:

- Input `{[()]}` -> `true`
- Input `{[(])}` -> `false`

## Question 3: Palindrome Check

Question ID: `a96e0554-9ffa-4317-803c-10cd16c63cba`

Read one lowercase word. Print `true` if it reads the same forwards and backwards; otherwise print `false`.

```cpp
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;

    std::size_t left = 0;
    std::size_t right = word.size();
    bool isPalindrome = true;

    while (left < right) {
        --right;
        if (word[left] != word[right]) {
            isPalindrome = false;
            break;
        }
        ++left;
    }

    std::cout << (isPalindrome ? "true" : "false") << '\n';
    return 0;
}
```

Expected test outputs:

- Input `racecar` -> `true`
- Input `hello` -> `false`

## Run Through The Services

The assessment service owns the assessment, question records, and test cases. The execution runner runs each submitted program and loads that question's test cases from the assessment service.

1. Ensure the assessment service is running at `http://localhost:4050`.
2. Ensure the execution runner is running at `http://localhost:4030`.
3. For each solution, send a synchronous execution request to `POST http://localhost:4030/execute?sync=true` with this body shape. Use the assessment ID above and the matching question ID listed in each section.

```json
{
  "assessment_id": "601d8324-4be0-45cd-bfd3-f937a83c865c",
  "question_id": "<question-id-for-this-solution>",
  "environment": "cpp-gcc",
  "language": "cpp",
  "sync": true,
  "code": "<paste the complete C++ program here>"
}
```

The runner returns a `test_case_results` array with each testcase's status and actual output. The runner must be configured to reach the assessment service, and `ASSESSMENT_INTERNAL_TOKEN` must be configured identically in both services so it can retrieve the protected execution cases.
