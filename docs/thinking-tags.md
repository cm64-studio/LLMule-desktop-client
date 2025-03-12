# Thinking Tags Feature

## Overview

LLMule Desktop now supports "thinking tags" for reasoning models. This feature allows AI models to show their step-by-step reasoning process in a collapsible section, keeping responses clean while still providing detailed reasoning when needed.

## How It Works

When using reasoning models like Claude 3 Opus or GPT-4, the model can include its detailed reasoning process within `<thinking></thinking>` or `<think></think>` tags. This content will be displayed in a collapsible section at the beginning of the message, allowing users to:

1. See the model's reasoning process first (when expanded)
2. Followed by the concise answer
3. Collapse the thinking section when no longer needed

This follows the natural reasoning flow: first think through the problem, then present the solution.

## Example

Here's an example of how a model might use thinking tags:

```
<thinking>
First, let me analyze the problem:
1. We need to find the roots of the equation x² - 4x + 3 = 0
2. I can use the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a
3. Here, a = 1, b = -4, c = 3
4. Calculating discriminant: b² - 4ac = (-4)² - 4(1)(3) = 16 - 12 = 4
5. So x = (4 ± √4) / 2 = (4 ± 2) / 2
6. This gives us x = 3 or x = 1
</thinking>

To find the roots of x² - 4x + 3 = 0, I'll use the quadratic formula:

x = (-b ± √(b² - 4ac)) / 2a

Where a = 1, b = -4, and c = 3.

Substituting these values:
x = (4 ± √(16 - 12)) / 2
x = (4 ± √4) / 2
x = (4 ± 2) / 2

This gives us two solutions:
x = 3 or x = 1

Therefore, the roots of the equation x² - 4x + 3 = 0 are 3 and 1.
```

The same can be done with the shorter `<think>` tag format:

```
<think>
First, let me analyze the problem:
1. We need to find the roots of the equation x² - 4x + 3 = 0
...detailed reasoning steps...
</think>

To find the roots of x² - 4x + 3 = 0, I'll use the quadratic formula:
...concise solution...
```

## Benefits

- **Natural Reasoning Flow**: Thinking process appears before the conclusion, matching how we naturally solve problems
- **Cleaner Responses**: Get concise answers without losing access to detailed reasoning
- **Better Understanding**: Expand the thinking section to see how the model arrived at its conclusion
- **Educational Value**: Great for learning complex topics by seeing the step-by-step process
- **Debugging**: Helpful for identifying where reasoning might have gone wrong
- **Transparency**: Provides insight into the model's thought process

## Using with Different Models

Different models may have varying support for thinking tags:

- **Claude Models**: Excellent support for thinking tags with structured reasoning (often uses `<think>` format)
- **GPT Models**: Can be instructed to use thinking tags for complex reasoning
- **Local Models**: Support varies by model, but most can be prompted to use this format

## Customizing System Prompts

You can customize your system prompts to encourage models to use thinking tags:

```
For complex reasoning tasks, please use <thinking></thinking> or <think></think> tags at the beginning of your response to show your step-by-step reasoning process. This will be displayed in a collapsible section in the UI.
```

## Feedback

We're continuously improving this feature. If you have suggestions or feedback, please let us know through our GitHub repository or support channels. 