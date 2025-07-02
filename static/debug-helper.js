/**
 * Debug Helper Script for WhatsApp Chat Viewer
 * 
 * This script can be run in the browser console to help diagnose issues.
 * It provides several utility functions for debugging the application state.
 */

// Make sure this runs after the app has loaded
if (typeof window !== 'undefined') {
	// Debug functions
	window.debugHelpers = {
		/**
		 * Get current application state and debug information
		 */
		getAppState() {
			if (typeof window.getDebugInfo === 'function') {
				return window.getDebugInfo();
			} else {
				console.warn('Debug info function not available. Make sure the app is fully loaded.');
				return null;
			}
		},

		/**
		 * Emergency reset the application state
		 */
		emergencyReset() {
			if (typeof window.emergencyReset === 'function') {
				console.log('🚨 Triggering emergency reset...');
				window.emergencyReset();
				console.log('✅ Emergency reset completed');
			} else {
				console.warn('Emergency reset function not available. Make sure the app is fully loaded.');
			}
		},

		/**
		 * Check if any operations are currently loading
		 */
		checkLoadingStates() {
			const state = this.getAppState();
			if (state) {
				console.log('Loading states:', state.loadingStates);
				console.log('Is loading:', state.appState.isLoading);
				console.log('Circuit breakers:', state.circuitBreaker);
			}
		},

		/**
		 * Clear IndexedDB completely (nuclear option)
		 */
		async clearDatabase() {
			if (confirm('⚠️ This will delete ALL chat data. Are you sure?')) {
				try {
					// Close any existing connections
					const databases = await indexedDB.databases();
					for (const db of databases) {
						if (db.name === 'whatsapp-chat-viewer') {
							console.log('Deleting database:', db.name);
							const deleteRequest = indexedDB.deleteDatabase(db.name);
							await new Promise((resolve, reject) => {
								deleteRequest.onsuccess = resolve;
								deleteRequest.onerror = reject;
							});
						}
					}
					console.log('🗑️ Database cleared. Please refresh the page.');
					alert('Database cleared. Please refresh the page.');
				} catch (error) {
					console.error('Failed to clear database:', error);
				}
			}
		},

		/**
		 * Monitor performance and detect potential issues
		 */
		startPerformanceMonitor() {
			let lastUpdate = Date.now();
			const checkInterval = 1000; // Check every second

			const monitor = setInterval(() => {
				const now = Date.now();
				const timeSinceLastUpdate = now - lastUpdate;
				
				// If more than 5 seconds without update, something might be wrong
				if (timeSinceLastUpdate > 5000) {
					console.warn('🐌 Potential performance issue detected. No activity for', timeSinceLastUpdate, 'ms');
					console.log('Current state:', this.getAppState());
				}
				
				lastUpdate = now;
			}, checkInterval);

			console.log('📊 Performance monitor started. Call window.debugHelpers.stopPerformanceMonitor() to stop.');
			
			// Store the interval ID so it can be stopped
			window.debugHelpers._performanceMonitor = monitor;
		},

		/**
		 * Stop the performance monitor
		 */
		stopPerformanceMonitor() {
			if (window.debugHelpers._performanceMonitor) {
				clearInterval(window.debugHelpers._performanceMonitor);
				delete window.debugHelpers._performanceMonitor;
				console.log('📊 Performance monitor stopped.');
			}
		},

		/**
		 * Test basic functionality
		 */
		async runBasicTests() {
			console.log('🧪 Running basic functionality tests...');
			
			try {
				// Test 1: Check if stores are accessible
				console.log('Test 1: Store accessibility');
				const state = this.getAppState();
				console.log(state ? '✅' : '❌', 'Store state accessible');

				// Test 2: Check IndexedDB
				console.log('Test 2: IndexedDB accessibility');
				const dbTest = await new Promise((resolve) => {
					const request = indexedDB.open('whatsapp-chat-viewer');
					request.onsuccess = () => {
						request.result.close();
						resolve(true);
					};
					request.onerror = () => resolve(false);
				});
				console.log(dbTest ? '✅' : '❌', 'IndexedDB accessible');

				// Test 3: Check if emergency functions work
				console.log('Test 3: Emergency functions');
				const hasEmergencyReset = typeof window.emergencyReset === 'function';
				console.log(hasEmergencyReset ? '✅' : '❌', 'Emergency reset function available');

				console.log('🧪 Basic tests completed');
			} catch (error) {
				console.error('❌ Test failed:', error);
			}
		},

		/**
		 * Show help information
		 */
		help() {
			console.log(`
🔧 WhatsApp Chat Viewer Debug Helper

Available commands:
• debugHelpers.getAppState() - Get current app state
• debugHelpers.emergencyReset() - Reset all application state
• debugHelpers.checkLoadingStates() - Check current loading operations
• debugHelpers.clearDatabase() - Delete all data (use with caution!)
• debugHelpers.startPerformanceMonitor() - Monitor for performance issues
• debugHelpers.stopPerformanceMonitor() - Stop performance monitoring
• debugHelpers.runBasicTests() - Run basic functionality tests
• debugHelpers.help() - Show this help

Troubleshooting tips:
1. If the UI is frozen, try: debugHelpers.emergencyReset()
2. If chats won't load, check: debugHelpers.checkLoadingStates()
3. For persistent issues, try: debugHelpers.clearDatabase() (CAUTION: deletes all data)
			`);
		}
	};

	// Show help on first load
	console.log('🔧 Debug helpers loaded! Type "debugHelpers.help()" for available commands.');
} else {
	console.error('Debug helpers can only be loaded in a browser environment.');
}
