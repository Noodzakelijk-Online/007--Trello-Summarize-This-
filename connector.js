// Trello Power-Up Connector
// This file initializes the Power-Up and defines card buttons

/* global TrelloPowerUp */

// Initialize the Power-Up
TrelloPowerUp.initialize({
  // Add a button to each card
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png', // AI/brain icon
      text: 'Summarize This',
      callback: function(t) {
        // Open the popup when button is clicked
        return t.popup({
          title: 'AI Card Summary',
          url: './popup.html',
          height: 500
        });
      }
    }];
  },

  // Add settings capability
  'show-settings': function(t, options) {
    return t.popup({
      title: 'Summarize This Settings',
      url: './settings-powerup.html',
      height: 400
    });
  },

  // Authorization capability for API keys
  'authorization-status': function(t, options) {
    return t.get('member', 'private', 'apiKeys')
      .then(function(apiKeys) {
        if (apiKeys && Object.keys(apiKeys).length > 0) {
          return { authorized: true };
        }
        return { authorized: false };
      });
  },

  'show-authorization': function(t, options) {
    return t.popup({
      title: 'Configure API Keys',
      url: './settings-powerup.html',
      height: 400
    });
  }
});

console.log('Summarize This Power-Up loaded successfully!');
