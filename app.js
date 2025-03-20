/*
  Handle letter removal when typing.
  Reworked for strict letter accounting.
*/
function handleLetterTyping(event) {
    const input = event.target;
    const currentValue = input.value.toUpperCase();
    
    // Handle backspace/delete - letters need to be returned to the pool
    if (currentValue.length < previousInputValue.length) {
      // Find which letter was deleted
      let deletedLetter = null;
      let deletedIndex = -1;
      
      // Find the position where the deletion happened
      for (let i = 0; i < previousInputValue.length; i++) {
        if (i >= currentValue.length || currentValue[i] !== previousInputValue[i]) {
          deletedLetter = previousInputValue[i];
          deletedIndex = i;
          break;
        }
      }
      
      if (deletedLetter) {
        console.log(`Letter deleted: ${deletedLetter} at position ${deletedIndex}`);
        
        // Find this letter in our temp removed list and return it
        const tempIndex = tempRemovedLetters.indexOf(deletedLetter);
        if (tempIndex !== -1) {
          // Remove it from temp list and add back to available letters
          tempRemovedLetters.splice(tempIndex, 1);
          dailyLetters.push(deletedLetter);
          console.log(`Returned letter ${deletedLetter} to available pool`);
          
          // Verify letter counts after operation
          const totalLetters = dailyLetters.length + tempRemovedLetters.length + 
                              usedWords.reduce((count, word) => count + word.length, 0);
          console.log(`Total letters after return: ${totalLetters} (should be ${window.originalLetters.length})`);
        }
        
        // Re-render the letters
        renderLetters();
      }
    } 
    // Handle new letter additions - letters need to be removed from the pool
    else if (currentValue.length > previousInputValue.length) {
      // Find which letter was added (usually at the end, but check all positions to be sure)
      let addedLetter = null;
      
      // In most cases this is just the last letter, but we check all positions to be safe
      if (currentValue.length === previousInputValue.length + 1) {
        addedLetter = currentValue[currentValue.length - 1];
      } else {
        // Multiple letters added? Find the difference
        for (let i = 0; i < currentValue.length; i++) {
          if (i >= previousInputValue.length || currentValue[i] !== previousInputValue[i]) {
            addedLetter = currentValue[i];
            break;
          }
        }
      }
      
      if (addedLetter) {
        console.log(`Letter added: ${addedLetter}`);
        
        // Check if we have this letter available
        const letterIndex = dailyLetters.indexOf(addedLetter);
        if (letterIndex !== -1) {
          // Remove exactly one instance of this letter
          dailyLetters.splice(letterIndex, 1);
          tempRemovedLetters.push(addedLetter);
          console.log(`Moved letter ${addedLetter} to temp removed pool`);
          
          // Verify letter counts after operation
          const totalLetters = dailyLetters.length + tempRemovedLetters.length + 
                              usedWords.reduce((count, word) => count + word.length, 0);
          console.log(`Total letters after removal: ${totalLetters} (should be ${window.originalLetters.length})`);
          
          // Re-render the letters
          renderLetters();
        } else {
          // Letter not available - revert input value
          console.log(`Letter ${addedLetter} not available, reverting input`);
          input.value = previousInputValue;
        }
      }
    }
    
    // Update previous value for next comparison
    previousInputValue = input.value.toUpperCase();
  }
  
  /*
    Return all temporarily removed letters when canceling input.
  */
  function returnTempLetters() {
    if (tempRemovedLetters.length > 0) {
      // Return all temp letters to the pool
      dailyLetters = dailyLetters.concat(tempRemovedLetters);
      tempRemovedLetters = [];
      renderLetters();
    }
    
    // Reset previous input value
    previousInputValue = '';
  }/* app.js */
  
  /*
    Game Configuration
  */
  const config = {
    minWords: 4, // Minimum number of words to use for puzzle
    maxWords: 6, // Maximum number of words to use for puzzle
    minLetterCount: 15, // Minimum number of unique letters
    maxLetterCount: 25  // Maximum number of unique letters
  };
  
  // Our global dictionary Set, loaded from words_alpha.txt
  let dictionary = new Set();
  // Common words for creating puzzles
  let commonWords = [];
  
  // Our solution (the words we used to create the puzzle)
  let solutionWords = [];
  let solutionLetterCount = 0;
  
  // Game state variables
  let dailyLetters = [];
  let usedWords = [];
  let wordLettersMap = new Map(); // Map to store which letters each word uses
  
  /*
    Load the dictionary and common words
  */
  function fetchDictionary() {
    const dictPromise = fetch('words_alpha.txt')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load dictionary file: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        // Each line is one word; convert to uppercase
        const lines = text.split('\n')
          .map(word => word.trim().toUpperCase())
          .filter(word => word.length > 0 && /^[A-Z]+$/.test(word)); // Only keep alphabetic words
        
        dictionary = new Set(lines);
        console.log(`Dictionary loaded with ${dictionary.size} words.`);
      });
      
    const commonWordsPromise = fetch('top_thousand_words.txt')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load common words file: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        // Each line is one word; convert to uppercase
        commonWords = text.split('\n')
          .map(word => word.trim().toUpperCase())
          .filter(word => {
            // Filter to words of reasonable length and only alphabetic characters
            return word.length >= 3 && 
                   word.length <= 8 && 
                   /^[A-Z]+$/.test(word) &&
                   !word.includes("DEATH"); // Exclude inappropriate words
          });
        
        console.log(`Common words loaded: ${commonWords.length}`);
      });
      
    return Promise.all([dictPromise, commonWordsPromise])
      .catch(error => {
        console.error('Error fetching files:', error);
        alert('Failed to load necessary files. Please try again later.');
      });
  }
  
  /*
    Generate the daily letter set from 4-6 common words.
    Complete rewrite with strict letter counting and validation.
  */
  function generateDailyLetters() {
    console.log("Generating new puzzle...");
    
    // Choose a random number of words between min and max
    const numWords = Math.floor(Math.random() * 
      (config.maxWords - config.minWords + 1)) + config.minWords;
    
    console.log(`Target number of solution words: ${numWords}`);
    
    // Clear previous solution
    solutionWords = [];
    
    // Map to track letter frequency (how many of each letter we need)
    const letterFrequencyMap = new Map();
    
    // Set a limit on attempts to find suitable words
    let attempts = 0;
    const maxAttempts = 100;
    
    // Keep selecting words until we have enough or exceed max attempts
    while (solutionWords.length < numWords && attempts < maxAttempts) {
      attempts++;
      
      // Get a random word from common words
      const randomIndex = Math.floor(Math.random() * commonWords.length);
      const word = commonWords[randomIndex];
      
      // Skip if we've already chosen this word
      if (solutionWords.includes(word)) continue;
      
      // Skip very short or very long words
      if (word.length < 3 || word.length > 8) continue;
      
      // Skip words with special characters or non-alphabetic characters
      if (!/^[A-Z]+$/.test(word)) continue;
      
      // Add word to our solution
      solutionWords.push(word);
      
      // Count letters in this word
      for (const letter of word) {
        const currentCount = letterFrequencyMap.get(letter) || 0;
        letterFrequencyMap.set(letter, currentCount + 1);
      }
    }
    
    // If we couldn't find enough words, try again
    if (solutionWords.length < config.minWords) {
      console.log("Not enough solution words found, retrying...");
      return generateDailyLetters(); // Recursively try again
    }
    
    // Convert the Map to an array of letters with proper frequency
    let letters = [];
    letterFrequencyMap.forEach((count, letter) => {
      for (let i = 0; i < count; i++) {
        letters.push(letter);
      }
    });
    
    // Check if we have an appropriate number of letters
    const uniqueLetterCount = new Set(letters).size;
    console.log(`Letter count: ${letters.length}, Unique letters: ${uniqueLetterCount}`);
    
    if (letters.length < config.minLetterCount) {
      console.log("Too few letters, retrying...");
      return generateDailyLetters(); // Recursively try again
    }
    
    if (letters.length > config.maxLetterCount) {
      console.log("Too many letters, will need to trim the solution words...");
      // If too many letters, we'll need to adjust our solution words
      // We'll do this by removing whole words until we're under the limit
      while (letters.length > config.maxLetterCount && solutionWords.length > config.minWords) {
        // Remove the longest word to reduce letter count most effectively
        const indexToRemove = solutionWords.reduce((maxIndex, word, index, arr) => {
          return word.length > arr[maxIndex].length ? index : maxIndex;
        }, 0);
        
        const removedWord = solutionWords.splice(indexToRemove, 1)[0];
        console.log(`Removed word: ${removedWord} to reduce letter count`);
        
        // Recalculate letter frequency
        letterFrequencyMap.clear();
        for (const word of solutionWords) {
          for (const letter of word) {
            const currentCount = letterFrequencyMap.get(letter) || 0;
            letterFrequencyMap.set(letter, currentCount + 1);
          }
        }
        
        // Rebuild the letters array
        letters = [];
        letterFrequencyMap.forEach((count, letter) => {
          for (let i = 0; i < count; i++) {
            letters.push(letter);
          }
        });
      }
    }
    
    // If we still have too many letters after adjustment, retry
    if (letters.length > config.maxLetterCount) {
      console.log("Still too many letters after adjustment, retrying...");
      return generateDailyLetters(); // Recursively try again
    }
    
    // Verify the solution words can actually be made with these letters
    if (!validateSolutionWords(solutionWords, letters)) {
      console.log("Solution validation failed, retrying...");
      return generateDailyLetters(); // Recursively try again
    }
    
    // Store the number of letters in our solution
    solutionLetterCount = letters.length;
    
    // IMPORTANT: Store the original letters for validation later
    window.originalLetters = [...letters];
    
    // Log our solution for debugging
    console.log("Successfully generated puzzle:");
    console.log("Solution words:", solutionWords);
    console.log("Letter count:", solutionLetterCount);
    console.log("Available letters:", letters.join(''));
    
    // Shuffle the letters
    return letters.sort(() => Math.random() - 0.5);
  }
  
  /*
    Validate that all solution words can actually be formed with the provided letters.
  */
  function validateSolutionWords(words, letters) {
    // Create a frequency map of the available letters
    const letterFreq = {};
    for (let letter of letters) {
      letterFreq[letter] = (letterFreq[letter] || 0) + 1;
    }
    
    // Check if each word can be formed with the available letters
    for (let word of words) {
      // Create a copy of the frequency map
      const tempFreq = {...letterFreq};
      
      // Check if all letters in the word are available
      for (let char of word) {
        if (!tempFreq[char] || tempFreq[char] <= 0) {
          console.log(`Word "${word}" cannot be formed: not enough letter "${char}"`);
          return false;
        }
        tempFreq[char]--;
      }
    }
    
    return true;
  }
  
  // Variables to track letter usage during typing
  let tempRemovedLetters = [];
  let previousInputValue = '';
  
  /*
    Render the letters in the UI.
  */
  function renderLetters() {
    const letterDisplay = document.getElementById('letterDisplay');
    letterDisplay.innerHTML = '';
    
    dailyLetters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.innerText = letter;
      span.setAttribute('data-index', index);
      span.setAttribute('data-letter', letter);
      letterDisplay.appendChild(span);
    });
  }
  
  /*
    Validate a submitted word by checking if it's in the dictionary
    and if it can be formed from the available letters.
  */
  function validateWord(word) {
    word = word.toUpperCase();
    
    // Debug: Log validation details
    console.log(`Validating word: ${word}`);
    console.log(`In dictionary: ${dictionary.has(word)}`);
    
    // Check if the word is in the dictionary
    if (!dictionary.has(word)) {
      console.log(`Word "${word}" not found in dictionary`);
      return false;
    }
    
    // Get all available letters (both visible and temporarily removed while typing)
    let availableLetters = [...dailyLetters, ...tempRemovedLetters]; 
    console.log(`Available letters: ${availableLetters.join('')}`);
    
    // Create a frequency map for the available letters
    const letterFreq = {};
    for (let letter of availableLetters) {
      letterFreq[letter] = (letterFreq[letter] || 0) + 1;
    }
    
    // Check if we have enough of each letter
    for (let char of word) {
      if (!letterFreq[char] || letterFreq[char] <= 0) {
        console.log(`Letter "${char}" not available or not enough instances`);
        return false;
      }
      letterFreq[char]--;
    }
    
    console.log(`Word "${word}" is valid`);
    return true;
  }
  
  /*
    Update the score display.
  */
  function updateScore() {
    document.getElementById('gameScore').innerText = `Words: ${usedWords.length}`;
  }
  
  /*
    Display a notification message.
  */
  function showNotification(message, type = 'default') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Set the message
    notificationMessage.textContent = message;
    
    // Remove any existing classes and add the new type
    notification.classList.remove('success', 'error', 'hidden');
    if (type !== 'default') {
      notification.classList.add(type);
    }
    
    // Show the notification
    notification.classList.remove('hidden');
    
    // If not a persistent notification, auto-hide after a delay
    if (type !== 'persistent') {
      setTimeout(() => {
        hideNotification();
      }, 3000);
    }
  }
  
  /*
    Hide the notification.
  */
  function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.add('hidden');
  }
  
  /*
    Track which letters are used for this word and store in Map.
    Completely rewritten for strict letter accounting.
  */
  function submitWord() {
    const wordInput = document.getElementById('wordInput');
    let word = wordInput.value.trim().toUpperCase();
    
    if (word === "") return;
    
    // Check if this is a valid word to submit (dictionary + available letters)
    if (!validateWord(word)) {
      // Show which condition failed
      if (!dictionary.has(word)) {
        showNotification(`"${word}" is not a valid word in our dictionary.`, 'error');
      } else {
        showNotification(`"${word}" cannot be formed from the available letters.`, 'error');
      }
      
      wordInput.value = '';
      
      // Return temporary removed letters to the pool
      returnTempLetters();
      return;
    }
    
    // Log state before submission for debugging
    console.log("BEFORE WORD SUBMISSION:");
    console.log(`Word: ${word}, length: ${word.length}`);
    console.log(`Available letters: ${dailyLetters.join('')}, count: ${dailyLetters.length}`);
    console.log(`Temp removed letters: ${tempRemovedLetters.join('')}, count: ${tempRemovedLetters.length}`);
    
    // Store the word in our used words list
    usedWords.push(word);
    
    // Store the word itself in the map - we'll use this directly when deleting
    wordLettersMap.set(word, word);
    
    // Create a frequency map of letters in the word
    const wordLetterFreq = {};
    for (let char of word) {
      wordLetterFreq[char] = (wordLetterFreq[char] || 0) + 1;
    }
    
    // First, clear any temporary removed letters (from the input box)
    const allAvailableLetters = [...dailyLetters, ...tempRemovedLetters];
    tempRemovedLetters = [];
    
    // Create a new daily letters array without the letters used in the word
    let newDailyLetters = [...allAvailableLetters];
    
    // Remove each letter of the word from our available letters
    for (let char in wordLetterFreq) {
      const count = wordLetterFreq[char];
      // Remove exactly 'count' instances of this letter
      for (let i = 0; i < count; i++) {
        const index = newDailyLetters.indexOf(char);
        if (index !== -1) {
          newDailyLetters.splice(index, 1);
        } else {
          console.error(`Letter ${char} not found in available letters!`);
        }
      }
    }
    
    // Update the daily letters
    dailyLetters = newDailyLetters;
    
    // Log state after submission for debugging
    console.log("AFTER WORD SUBMISSION:");
    console.log(`Remaining letters: ${dailyLetters.join('')}, count: ${dailyLetters.length}`);
    
    // Verify letter counts
    const totalLetters = dailyLetters.length + 
                       usedWords.reduce((count, word) => count + word.length, 0);
    
    console.log(`Total letters after submission: ${totalLetters} (should be ${window.originalLetters.length})`);
    
    if (totalLetters !== window.originalLetters.length) {
      console.error("LETTER COUNT MISMATCH AFTER SUBMISSION!");
      verifyLetterCounts();
    }
    
    // Add the word to the list with a delete button
    addWordToList(word);
    
    // Clear the input and previous state
    wordInput.value = '';
    previousInputValue = '';
    
    // Update the UI
    renderLetters();
    updateScore();
    
    // Show success notification
    showNotification(`Word "${word}" added successfully!`, 'success');
    
    // Check if all letters have been used
    checkGameCompletion();
  }
  
  /*
    Add a submitted word to the list with a delete button.
  */
  function addWordToList(word) {
    const wordsList = document.getElementById('wordsList');
    const li = document.createElement('li');
    
    // Create the word span
    const wordSpan = document.createElement('span');
    wordSpan.innerText = word;
    
    // Create the delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '×';
    deleteBtn.title = 'Remove this word';
    deleteBtn.className = 'delete-word-btn';
    deleteBtn.addEventListener('click', () => deleteWord(word, li));
    
    // Add to the list item
    li.appendChild(wordSpan);
    li.appendChild(deleteBtn);
    
    // Add to the words list
    wordsList.appendChild(li);
  }
  
  /*
    Delete a word and return its letters to the available pool.
    This implementation directly adds back all letters from the word.
  */
  function deleteWord(word, listItem) {
    console.log(`Deleting word: ${word}`);
    
    const index = usedWords.indexOf(word);
    if (index !== -1) {
      // Remove the word from the list
      usedWords.splice(index, 1);
      
      console.log(`Current letters available before restoration: ${dailyLetters.join('')}`);
      
      // SIMPLIFIED APPROACH: Just add back each letter of the word
      // This ensures all letters are restored regardless of tracking issues
      for (let char of word) {
        dailyLetters.push(char);
      }
      
      // Clean up the tracking map
      wordLettersMap.delete(word);
      
      console.log(`Letters after restoration: ${dailyLetters.join('')}`);
      
      // Remove the word from the UI
      listItem.remove();
      
      // Update the UI
      renderLetters();
      updateScore();
      
      // Show notification
      showNotification(`Word "${word}" removed and letters returned.`, 'success');
    }
  }
  
  /*
    Check if the game is completed (all letters used).
  */
  function checkGameCompletion() {
    if (dailyLetters.length === 0) {
      // Hide the input area
      document.getElementById('inputArea').style.display = 'none';
      
      // Remove delete buttons from all words
      const deleteButtons = document.querySelectorAll('.delete-word-btn');
      deleteButtons.forEach(button => {
        button.remove();
      });
      
      const gameScore = document.getElementById('gameScore');
      
      // Create the completion message
      const completionDiv = document.createElement('div');
      completionDiv.className = 'game-completed';
      
      // CRITICAL VALIDATION: Make sure all letters were actually used
      // Count all letters used in player's words
      const playerLetters = [];
      for (const word of usedWords) {
        for (const letter of word) {
          playerLetters.push(letter);
        }
      }
      
      // Count all letters in the original solution
      const solutionLetters = [];
      for (const word of solutionWords) {
        for (const letter of word) {
          solutionLetters.push(letter);
        }
      }
      
      // Sort both arrays to make comparison easier in logs
      playerLetters.sort();
      solutionLetters.sort();
      
      console.log("FINAL VALIDATION:");
      console.log("Player's letters:", playerLetters.join(''));
      console.log("Solution letters:", solutionLetters.join(''));
      console.log("Original letters:", window.originalLetters.sort().join(''));
      
      // Check if we have the same number of letters
      if (playerLetters.length !== solutionLetters.length || 
          playerLetters.length !== window.originalLetters.length) {
        console.error("LETTER COUNT MISMATCH DETECTED!");
        console.error(`Player: ${playerLetters.length}, Solution: ${solutionLetters.length}, Original: ${window.originalLetters.length}`);
      }
      
      // Create comparison content
      const playerCount = usedWords.length;
      const solutionCount = solutionWords.length;
      
      // Determine the comparison message
      let comparisonMsg = '';
      if (playerCount < solutionCount) {
        comparisonMsg = `Amazing! You found a better solution than ours using fewer words!`;
      } else if (playerCount === solutionCount) {
        comparisonMsg = `Great job! You matched our solution perfectly!`;
      } else {
        // Fix grammar for singular vs plural
        const wordForm = solutionCount === 1 ? "word" : "words";
        comparisonMsg = `Well done! Our solution used ${solutionCount} ${wordForm}, but you used ${playerCount}.`;
      }
      
      // Build full completion message
      completionDiv.innerHTML = `
        <h3>Puzzle Complete!</h3>
        <p>You used ${playerCount} word${playerCount === 1 ? '' : 's'} to solve the puzzle.</p>
        <p>${comparisonMsg}</p>
        <div class="solution-words">
          <h4>Our Solution:</h4>
          <p>${solutionWords.join(', ')}</p>
        </div>
        <button id="playAgainBtn" class="play-again-btn">Play Again</button>
      `;
      
      // Replace score with completion message
      gameScore.innerHTML = '';
      gameScore.appendChild(completionDiv);
      
      // Add event listener to the Play Again button
      document.getElementById('playAgainBtn').addEventListener('click', resetGame);
      
      // Show success notification instead of alert
      showNotification(`Congratulations! You've used all the letters in ${playerCount} word${playerCount === 1 ? '' : 's'}.`, 'success');
    }
  }
  
  /*
    Set up modals for Instructions and Settings.
  */
  function setupModals() {
    // Instructions Modal
    const instructionsModal = document.getElementById('instructionsModal');
    const showInstructions = document.getElementById('showInstructions');
    const closeInstructions = document.getElementById('closeInstructions');
    
    showInstructions.onclick = () => {
      instructionsModal.style.display = 'block';
    };
    closeInstructions.onclick = () => {
      instructionsModal.style.display = 'none';
    };
    
    // Settings Modal
    const settingsModal = document.getElementById('settingsModal');
    const showSettings = document.getElementById('showSettings');
    const closeSettings = document.getElementById('closeSettings');
    const applySettings = document.getElementById('applySettings');
    
    showSettings.onclick = () => {
      settingsModal.style.display = 'block';
      // Set current value in the dropdown
      document.getElementById('letterCountSetting').value = config.letterCount.toString();
    };
    closeSettings.onclick = () => {
      settingsModal.style.display = 'none';
    };
    
    // Apply Settings
    applySettings.onclick = () => {
      const letterCountSetting = document.getElementById('letterCountSetting');
      config.letterCount = parseInt(letterCountSetting.value);
      
      // Reset the game with new settings
      resetGame();
      
      // Close the modal
      settingsModal.style.display = 'none';
    };
    
    // Close modal when clicking outside of it
    window.onclick = function(event) {
      if (event.target === instructionsModal) {
        instructionsModal.style.display = 'none';
      }
      if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    };
  }
  
  /*
    Reset the game with current settings.
  */
  function resetGame() {
    // Clear existing data
    dailyLetters = [];
    usedWords = [];
    wordLettersMap.clear();
    solutionWords = [];
    tempRemovedLetters = [];
    previousInputValue = '';
    
    // Show the input area if it was hidden
    document.getElementById('inputArea').style.display = 'flex';
    
    // Generate new letters
    dailyLetters = generateDailyLetters();
    
    // Clear the words list
    document.getElementById('wordsList').innerHTML = '';
    
    // Reset the score display
    document.getElementById('gameScore').innerHTML = 'Words: 0';
    updateScore();
    
    // Clear input field
    document.getElementById('wordInput').value = '';
    
    // Render the new letters
    renderLetters();
    
    // Show notification
    showNotification('New puzzle started!', 'success');
  }
  
  /*
    Debug helper to verify letter counts and track down any issues
  */
  function verifyLetterCounts() {
    // Count letters in the current puzzle
    const currentLetters = [...dailyLetters, ...tempRemovedLetters];
    
    // Count letters in all words
    const usedLettersList = [];
    for (const word of usedWords) {
      for (const letter of word) {
        usedLettersList.push(letter);
      }
    }
    
    // Get original letter counts for comparison
    const originalLetters = window.originalLetters || [];
    
    // Sort all arrays for easier visual comparison
    currentLetters.sort();
    usedLettersList.sort();
    const sortedOriginal = [...originalLetters].sort();
    
    // Create frequency maps to compare
    const originalFreq = {};
    const currentUsedFreq = {};
    
    for (const letter of sortedOriginal) {
      originalFreq[letter] = (originalFreq[letter] || 0) + 1;
    }
    
    for (const letter of currentLetters) {
      currentUsedFreq[letter] = (currentUsedFreq[letter] || 0) + 1;
    }
    
    for (const letter of usedLettersList) {
      currentUsedFreq[letter] = (currentUsedFreq[letter] || 0) + 1;
    }
    
    // Compare frequencies
    let mismatch = false;
    let mismatchDetails = [];
    
    for (const letter in originalFreq) {
      const originalCount = originalFreq[letter];
      const currentCount = currentUsedFreq[letter] || 0;
      
      if (originalCount !== currentCount) {
        mismatch = true;
        mismatchDetails.push(`${letter}: original=${originalCount}, current=${currentCount}`);
      }
    }
    
    // Log results
    console.log("LETTER VERIFICATION:");
    console.log("Original:", sortedOriginal.join(''));
    console.log("Current available:", currentLetters.join(''));
    console.log("In used words:", usedLettersList.join(''));
    console.log("Total current:", [...currentLetters, ...usedLettersList].sort().join(''));
    
    if (mismatch) {
      console.error("LETTER COUNT MISMATCH DETECTED:");
      console.error(mismatchDetails);
    } else {
      console.log("Letter counts match correctly!");
    }
  }
  
  /*
    Display information about the dictionary and available letters.
    This is a debugging function.
  */
  function showGameState() {
    console.log("Game State:");
    console.log("Dictionary size:", dictionary.size);
    console.log("Common words loaded:", commonWords.length);
    console.log("Current solution words:", solutionWords);
    console.log("Available letters:", dailyLetters);
    console.log("Temporarily removed letters:", tempRemovedLetters);
    console.log("Used words:", usedWords);
    
    // Check if specific words are in the dictionary
    const testWords = ["QUILT", "PIANO", "ZEBRA", "JAZZ", "COMPUTER"];
    testWords.forEach(word => {
      console.log(`Is "${word}" in dictionary: ${dictionary.has(word)}`);
    });
  }
  
  /*
    Initialize the game.
  */
  function initGame() {
    fetchDictionary().then(() => {
      // Generate initial letter set
      dailyLetters = generateDailyLetters();
      
      // Set up the debug helper in the global scope but not visible to user
      window.debugLetters = function() {
        console.log("DEBUG LETTER COUNTS:");
        console.log("Current available letters:", dailyLetters);
        
        // Count letters in used words
        const usedLetters = [];
        for (const word of usedWords) {
          for (const letter of word) {
            usedLetters.push(letter);
          }
        }
        
        console.log("Letters in used words:", usedLetters);
        console.log("Original letters:", window.originalLetters);
        
        // Check if we have the right total
        const total = dailyLetters.length + usedLetters.length;
        console.log(`Total letter count: ${total} (should equal ${window.originalLetters.length})`);
        
        if (total !== window.originalLetters.length) {
          console.error("LETTER COUNT MISMATCH!");
        }
        
        return "Letter debugging complete";
      };
      
      // Render UI
      renderLetters();
      updateScore();
      
      // Set up modals and event listeners
      setupModals();
      
      // Add a reset game button to footer
      const footer = document.querySelector('footer');
      const resetButton = document.createElement('button');
      resetButton.id = 'resetGame';
      resetButton.innerText = 'New Puzzle';
      resetButton.addEventListener('click', resetGame);
      footer.appendChild(resetButton);
      
      // Set up notification close button
      document.getElementById('closeNotification').addEventListener('click', hideNotification);
      
      // Set up input event listeners for real-time letter tracking
      const wordInput = document.getElementById('wordInput');
      wordInput.addEventListener('input', handleLetterTyping);
      
      // Handle escape key to cancel input
      wordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          wordInput.value = '';
          returnTempLetters();
        }
      });
      
      // Show welcome notification
      showNotification('Welcome to Scrambled! Create words using the available letters.', 'success');
      
      // Debug: Show game state in console
      setTimeout(showGameState, 1000);
    });
  }
  
  // Event Listeners
  document.getElementById('submitWord').addEventListener('click', submitWord);
  document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      submitWord();
    }
  });
  
  // Start game on page load
  window.onload = initGame;