/**
 * Donation Service - Manages donation prompts and tracking
 */

class DonationService {
  constructor() {
    this.STORAGE_KEY = 'nebula_donations';
    this.PROMPT_KEY = 'nebula_donation_prompts';
    
    // Donation platforms
    this.platforms = {
      paypal: {
        name: 'PayPal',
        icon: '💳',
        url: 'https://paypal.me/yourusername', // Replace with your PayPal link
        description: 'One-time or recurring donations'
      },
      kofi: {
        name: 'Ko-fi',
        icon: '☕',
        url: 'https://ko-fi.com/yourusername', // Replace with your Ko-fi link
        description: 'Buy me a coffee'
      },
      github: {
        name: 'GitHub Sponsors',
        icon: '❤️',
        url: 'https://github.com/sponsors/yourusername', // Replace with your GitHub link
        description: 'Monthly sponsorship'
      }
    };
  }

  // Get donation data
  getDonationData() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  // Get prompt data
  getPromptData() {
    try {
      return JSON.parse(localStorage.getItem(this.PROMPT_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  // Save prompt data
  savePromptData(data) {
    localStorage.setItem(this.PROMPT_KEY, JSON.stringify(data));
  }

  // Check if we should show donation prompt
  shouldShowPrompt() {
    const data = this.getPromptData();
    const now = Date.now();

    // Never show if user dismissed permanently
    if (data.dismissedPermanently) {
      return false;
    }

    // Show after certain milestones
    const conversions = this.getConversionCount();
    const milestones = [10, 25, 50, 100]; // Show at these conversion counts
    
    if (milestones.includes(conversions) && !data[`shown_${conversions}`]) {
      return true;
    }

    // Show every 7 days if user hasn't dismissed
    if (data.lastShown) {
      const daysSinceLastShow = (now - data.lastShown) / (1000 * 60 * 60 * 24);
      if (daysSinceLastShow >= 7) {
        return true;
      }
    } else {
      // First time - show after 5 conversions
      return conversions >= 5;
    }

    return false;
  }

  // Mark prompt as shown
  markPromptShown() {
    const data = this.getPromptData();
    const conversions = this.getConversionCount();
    
    data.lastShown = Date.now();
    data[`shown_${conversions}`] = true;
    data.totalShown = (data.totalShown || 0) + 1;
    
    this.savePromptData(data);
  }

  // Dismiss prompt (later)
  dismissPrompt() {
    const data = this.getPromptData();
    data.lastDismissed = Date.now();
    data.dismissCount = (data.dismissCount || 0) + 1;
    this.savePromptData(data);
  }

  // Dismiss permanently (no more prompts)
  dismissPermanently() {
    const data = this.getPromptData();
    data.dismissedPermanently = true;
    data.permanentDismissDate = Date.now();
    this.savePromptData(data);
  }

  // Get conversion count
  getConversionCount() {
    try {
      const history = JSON.parse(localStorage.getItem('conversion_history') || '[]');
      return history.length;
    } catch (error) {
      return 0;
    }
  }

  // Get donation impact messages
  getImpactMessages() {
    return [
      {
        icon: '⚡',
        title: 'Server Costs',
        description: 'Help cover hosting and bandwidth for faster conversions'
      },
      {
        icon: '🎨',
        title: 'New Features',
        description: 'Support development of advanced editing tools and filters'
      },
      {
        icon: '🔧',
        title: 'Maintenance',
        description: 'Keep the app updated with latest formats and bug fixes'
      },
      {
        icon: '💾',
        title: 'Storage & CDN',
        description: 'Provide cloud storage and faster file delivery'
      },
      {
        icon: '🌍',
        title: 'Keep It Free',
        description: 'Help us maintain free access for everyone forever'
      },
      {
        icon: '🚀',
        title: 'Development Time',
        description: 'Support full-time development and faster feature releases'
      }
    ];
  }

  // Get thank you messages
  getThankYouMessage(conversions) {
    if (conversions >= 100) {
      return {
        title: 'Power User! 🌟',
        message: `You've completed ${conversions} conversions! You're clearly getting value from Nebula. Consider supporting us?`
      };
    } else if (conversions >= 50) {
      return {
        title: 'Frequent User! 🎉',
        message: `${conversions} conversions and counting! If Nebula saves you time, a small donation helps us improve it!`
      };
    } else if (conversions >= 25) {
      return {
        title: 'Regular User! ✨',
        message: `You've used Nebula ${conversions} times! Loving it? Support development with a coffee!`
      };
    } else if (conversions >= 10) {
      return {
        title: 'Great Start! 🚀',
        message: `${conversions} conversions done! If you find Nebula useful, consider buying us a coffee!`
      };
    } else {
      return {
        title: 'Enjoying Nebula? 💜',
        message: 'Nebula is free forever, but donations help us add features and cover costs!'
      };
    }
  }

  // Track donation click
  trackDonationClick(platform) {
    const data = this.getDonationData();
    data.clicks = data.clicks || {};
    data.clicks[platform] = (data.clicks[platform] || 0) + 1;
    data.lastClickDate = Date.now();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // Get suggested amounts
  getSuggestedAmounts() {
    return [
      { amount: 3, label: '☕ Coffee', description: 'Buy us a coffee!' },
      { amount: 5, label: '🍕 Lunch', description: 'Grab us lunch!' },
      { amount: 10, label: '🎁 Support', description: 'Show your support!' },
      { amount: 20, label: '💝 Generous', description: 'Super generous!' },
      { amount: 50, label: '🌟 Amazing', description: 'You\'re amazing!' }
    ];
  }
}

export default new DonationService();
