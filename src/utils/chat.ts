// Helper to split text into natural fragments
function splitIntoFragments(text: string): string[] {
  // Split on sentence boundaries and line breaks
  const fragments = text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(fragment => fragment.trim().length > 0);

  // Combine very short fragments
  const combinedFragments: string[] = [];
  let currentFragment = '';

  fragments.forEach(fragment => {
    if (currentFragment.length + fragment.length < 50) {
      currentFragment += (currentFragment ? ' ' : '') + fragment;
    } else {
      if (currentFragment) {
        combinedFragments.push(currentFragment);
      }
      currentFragment = fragment;
    }
  });

  if (currentFragment) {
    combinedFragments.push(currentFragment);
  }

  return combinedFragments;
}

// Calculate typing delay based on text length and complexity
function calculateTypingDelay(text: string): number {
  // Base delay of 30ms per character
  const baseDelay = 30;
  
  // Additional delay for punctuation and special characters
  const complexityFactor = text.match(/[.!?,;:]|\n/g)?.length || 0;
  
  // Calculate total delay
  const delay = Math.min(
    // Minimum delay of 500ms
    Math.max(500, 
      // Calculate delay based on length and complexity
      text.length * baseDelay + complexityFactor * 200
    ),
    // Maximum delay of 2000ms
    2000
  );

  // Add some randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4;
  return Math.round(delay * randomFactor);
}

// Simulate natural typing with delays
export async function simulateTyping(
  text: string,
  onFragment: (fragment: string) => void | Promise<void>
): Promise<void> {
  const fragments = splitIntoFragments(text);
  
  for (const fragment of fragments) {
    // Calculate delay based on fragment length and complexity
    const delay = calculateTypingDelay(fragment);
    
    // Wait before showing next fragment
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Show the fragment
    await onFragment(fragment);
  }
}