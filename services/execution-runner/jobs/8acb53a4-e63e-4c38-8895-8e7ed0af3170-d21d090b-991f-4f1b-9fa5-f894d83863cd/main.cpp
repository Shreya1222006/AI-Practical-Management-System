#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    int n;
    int target;
    std::cin >> n >> target;

    std::unordered_map<int, int> firstIndex;
    for (int index = 0; index < n; ++index) {
        int value;
        std::cin >> value;

        const int complement = target - value;
        const auto match = firstIndex.find(complement);
        if (match != firstIndex.end()) {
            std::cout << match->second << ' ' << index << '\n';
            return 0;
        }

        firstIndex.emplace(value, index);
    }

    return 0;
  }