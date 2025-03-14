/* app.js */

/*
  Game Configuration
*/
const config = {
    minWords: 3, // Minimum number of words to use for puzzle
    maxWords: 5, // Maximum number of words to use for puzzle
    minLetterCount: 10, // Minimum number of unique letters
    maxLetterCount: 20  // Maximum number of unique letters
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
  
  // Load the dictionary and common words
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
        const lines = text.split('\n').map(word => word.trim().toUpperCase());
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
          .filter(word => word.length >= 3 && word.length <= 8); // Filter to reasonable word lengths
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
    This ensures the puzzle is solvable.
  */
  function generateDailyLetters() {
    // Choose a random number of words between min and max
    const numWords = Math.floor(Math.random() * 
      (config.maxWords - config.minWords + 1)) + config.minWords;
    
    // Clear previous solution
    solutionWords = [];
    
    // Map to track letter frequency
    const letterFrequencyMap = new Map();
    
    // Select random words from our common words
    while (solutionWords.length < numWords) {
      // Get a random word from common words
      const randomIndex = Math.floor(Math.random() * commonWords.length);
      const word = commonWords[randomIndex];
      
      // Skip if we've already chosen this word
      if (solutionWords.includes(word)) continue;
      
      // Add word to our solution
      solutionWords.push(word);
      
      // Count letters in this word
      for (const letter of word) {
        const currentCount = letterFrequencyMap.get(letter) || 0;
        letterFrequencyMap.set(letter, currentCount + 1);
      }
    }
    
    // Convert the Map to an array of letters with proper frequency
    let letters = [];
    letterFrequencyMap.forEach((count, letter) => {
      for (let i = 0; i < count; i++) {
        letters.push(letter);
      }
    });
    
    // Check if we have an appropriate number of letters
    if (letters.length < config.minLetterCount) {
      // If too few letters, try again
      return generateDailyLetters();
    }
    
    if (letters.length > config.maxLetterCount) {
      // If too many letters, truncate the list
      // Note: This could make the puzzle unsolvable with our exact words,
      // so we'll need to adjust our solution words accordingly
      letters = letters.slice(0, config.maxLetterCount);
      
      // Recalculate which solution words are still possible
      adjustSolutionWords(letters);
    }
    
    // Store the number of letters in our solution
    solutionLetterCount = letters.length;
    
    // Log our solution for debugging
    console.log("Solution words:", solutionWords);
    console.log("Letter count:", solutionLetterCount);
    console.log("Available letters:", letters);
    
    // Shuffle the letters
    return letters.sort(() => Math.random() - 0.5);
  }
  
  /*
    Adjust solution words if we had to truncate the letter list
  */
  function adjustSolutionWords(availableLetters) {
    // Create a copy of our available letters
    let remainingLetters = [...availableLetters];
    let validSolutionWords = [];
    
    // Check each word if it can be formed with the available letters
    for (const word of solutionWords) {
      let canFormWord = true;
      let tempLetters = [...remainingLetters];
      
      // Check if all letters in the word are available
      for (const letter of word) {
        const index = tempLetters.indexOf(letter);
        if (index === -1) {
          canFormWord = false;
          break;
        }
        tempLetters.splice(index, 1);
      }
      
      if (canFormWord) {
        validSolutionWords.push(word);
        
        // Remove the used letters from remainingLetters
        for (const letter of word) {
          const index = remainingLetters.indexOf(letter);
          remainingLetters.splice(index, 1);
        }
      }
    }
    
    // Update our solution words
    solutionWords = validSolutionWords;
  }
  
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
      letterDisplay.appendChild(span);
    });
  }
  
  /*
    Validate a submitted word by checking if it's in the dictionary
    and if it can be formed from the available letters.
  */
  function validateWord(word) {
    word = word.toUpperCase();
    
    // Check if the word is in the dictionary
    if (!dictionary.has(word)) {
      return false;
    }
    
    // Check if the word can be formed with available letters
    let availableLetters = [...dailyLetters]; // Create a copy of the array
    for (let char of word) {
      let index = availableLetters.indexOf(char);
      if (index === -1) {
        return false;
      }
      availableLetters.splice(index, 1);
    }
    
    return true;
  }
  
  /*
    Update the score display.
  */
  function updateScore() {
    document.getElementById('gameScore').innerText = `Words: ${usedWords.length}`;
  }
  
  /*
    Handle submission of a word.
  */
  function submitWord() {
    const wordInput = document.getElementById('wordInput');
    let word = wordInput.value.trim().toUpperCase();
    
    if (word === "") return;
    
    if (!validateWord(word)) {
      alert(`"${word}" is not a valid word or cannot be formed from the available letters.`);
      wordInput.value = '';
      return;
    }
    
    // Track which letters are used for this word
    let usedLetters = [];
    let tempDailyLetters = [...dailyLetters]; // Create a copy
    
    // Find which letters are used in the word
    for (let char of word) {
      let index = tempDailyLetters.indexOf(char);
      if (index !== -1) {
        usedLetters.push(tempDailyLetters[index]);
        tempDailyLetters.splice(index, 1);
      }
    }
    
    // Store the word and its used letters
    usedWords.push(word);
    wordLettersMap.set(word, usedLetters);
    
    // Remove used letters from the daily letters
    tempDailyLetters = [...dailyLetters]; // Reset temp array
    for (let char of word) {
      let index = tempDailyLetters.indexOf(char);
      if (index !== -1) {
        dailyLetters.splice(dailyLetters.indexOf(char), 1);
        tempDailyLetters.splice(index, 1);
      }
    }
    
    // Add the word to the list with a delete button
    addWordToList(word);
    
    // Clear the input
    wordInput.value = '';
    
    // Update the UI
    renderLetters();
    updateScore();
    
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
    deleteBtn.addEventListener('click', () => deleteWord(word, li));
    
    // Add to the list item
    li.appendChild(wordSpan);
    li.appendChild(deleteBtn);
    
    // Add to the words list
    wordsList.appendChild(li);
  }
  
  /*
    Delete a word and return its letters to the available pool.
  */
  function deleteWord(word, listItem) {
    const index = usedWords.indexOf(word);
    if (index !== -1) {
      // Remove the word from the list
      usedWords.splice(index, 1);
      
      // Get the letters used for this word
      const letters = wordLettersMap.get(word);
      
      // Add the letters back to the available pool
      if (letters) {
        dailyLetters = dailyLetters.concat(letters);
        wordLettersMap.delete(word);
      }
      
      // Remove the word from the UI
      listItem.remove();
      
      // Update the UI
      renderLetters();
      updateScore();
    }
  }
  
  /*
    Check if the game is completed (all letters used).
  */
  function checkGameCompletion() {
    if (dailyLetters.length === 0) {
      const gameScore = document.getElementById('gameScore');
      
      // Create the completion message
      const completionDiv = document.createElement('div');
      completionDiv.className = 'game-completed';
      
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
        comparisonMsg = `Well done! Our solution used ${solutionCount} words, but you used ${playerCount}.`;
      }
      
      // Build full completion message
      completionDiv.innerHTML = `
        <h3>Puzzle Complete!</h3>
        <p>You used ${playerCount} word(s) to solve the puzzle.</p>
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
      
      // Show a small alert to notify completion
      alert(`Congratulations! You've used all the letters in ${playerCount} word(s).`);
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
    
    // Generate new letters
    dailyLetters = generateDailyLetters();
    
    // Clear the words list
    document.getElementById('wordsList').innerHTML = '';
    
    // Reset the score display
    document.getElementById('gameScore').innerHTML = 'Words: 0';
    updateScore();
    
    // Render the new letters
    renderLetters();
  }
  
  /*
    Initialize the game.
  */
  function initGame() {
    fetchDictionary().then(() => {
      // Generate initial letter set
      dailyLetters = generateDailyLetters();
      
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