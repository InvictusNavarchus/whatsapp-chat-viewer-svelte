<script lang="ts">
	import { storeService } from '$lib/stores';
	import { WhatsAppParser } from '$lib/parser.js';
	import log from '$lib/logger';
	
	let isDragOver = false;
	let isUploading = false;
	let uploadError = '';
	let uploadSuccess = '';
	let fileInput: HTMLInputElement;

	/**
	 * Handle file drop event
	 */
	function handleDrop(event: DragEvent) {
		console.log('DROP: Drop event triggered');
		event.preventDefault();
		isDragOver = false;
		
		const files = event.dataTransfer?.files;
		console.log('DROP: Files found:', files?.length);
		if (files && files.length > 0) {
			console.log('DROP: About to call handleFileUpload');
			handleFileUpload(files[0]);
		}
	}

	/**
	 * Handle drag over event
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	/**
	 * Handle drag leave event
	 */
	function handleDragLeave() {
		isDragOver = false;
	}

	/**
	 * Handle file input change
	 */
	function handleFileInput(event: Event) {
		console.log('FILE INPUT: Event triggered');
		console.log('FILE INPUT: Event object:', event);
		
		const target = event.target as HTMLInputElement;
		console.log('FILE INPUT: Target acquired:', target);
		
		console.log('FILE INPUT: About to access target.files');
		const files = target.files;
		console.log('FILE INPUT: Files acquired, about to check length');
		console.log('FILE INPUT: Files found:', files?.length);
		
		if (files && files.length > 0) {
			console.log('FILE INPUT: About to call handleFileUpload');
			handleFileUpload(files[0]);
		} else {
			console.log('FILE INPUT: No files found or files is null');
		}
	}

	/**
	 * Process uploaded file and parse WhatsApp chat
	 */
	async function handleFileUpload(file: File) {
		console.log('STEP 0: Function started, clearing states');
		uploadError = '';
		uploadSuccess = '';
		isUploading = true;

		try {
			console.log('STEP 1: Starting file upload process, file:', file.name, 'type:', file.type);
			
			// Validate file type
			console.log('STEP 1.1: About to validate file type');
			if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
				throw new Error('Please upload a text file (.txt)');
			}
			console.log('STEP 1.2: File type validation passed');

			console.log('STEP 2: About to read file content');
			// Read file content
			const content = await readFileContent(file);
			console.log('STEP 2 COMPLETE: File content read, length:', content.length);
			
			console.log('STEP 3: Validating content format');
			// Validate content format
			const validation = WhatsAppParser.validate(content);
			if (!validation.isValid) {
				throw new Error(`Invalid WhatsApp chat format:\n${validation.errors.join('\n')}`);
			}
			console.log('STEP 3 COMPLETE: Content validation passed');

			console.log('STEP 4: Parsing chat content');
			// Parse the chat
			const { messages, metadata } = WhatsAppParser.parse(content);
			console.log('STEP 4 COMPLETE: Parsed', messages.length, 'messages');
			
			if (messages.length === 0) {
				throw new Error('No messages found in the uploaded file');
			}

			console.log('STEP 5: About to store chat with', messages.length, 'messages');
			console.log('STEP 5: Calling storeService.addChat...');
			
			// Store in database
			const chatId = await storeService.addChat(
				metadata.name,
				metadata.participants,
				messages,
				content
			);
			
			console.log('STEP 5 COMPLETE: Chat stored with ID:', chatId);

			uploadSuccess = `Successfully imported ${messages.length} messages from "${metadata.name}"`;
			console.log('STEP 6: Upload completed successfully');
			
			// Clear file input
			if (fileInput) {
				fileInput.value = '';
			}

		} catch (error) {
			console.error('Upload error at step:', error);
			uploadError = error instanceof Error ? error.message : 'Failed to upload file';
		} finally {
			console.log('CLEANUP: Setting isUploading to false');
			isUploading = false;
		}
	}

	/**
	 * Read file content as text
	 */
	function readFileContent(file: File): Promise<string> {
		console.log('READ FILE: Starting to read file');
		return new Promise((resolve, reject) => {
			console.log('READ FILE: Creating FileReader');
			const reader = new FileReader();
			reader.onload = () => {
				console.log('READ FILE: File read successfully');
				resolve(reader.result as string);
			};
			reader.onerror = () => {
				console.log('READ FILE: Error reading file');
				reject(new Error('Failed to read file'));
			};
			console.log('READ FILE: Starting readAsText');
			reader.readAsText(file, 'utf-8');
		});
	}

	/**
	 * Open file picker
	 */
	function openFilePicker() {
		fileInput?.click();
	}

	/**
	 * Clear messages
	 */
	function clearMessages() {
		uploadError = '';
		uploadSuccess = '';
	}
</script>

<div class="upload-container">
	<div 
		class="upload-area"
		class:drag-over={isDragOver}
		class:uploading={isUploading}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		role="button"
		tabindex="0"
		on:click={openFilePicker}
		on:keydown={(e) => e.key === 'Enter' && openFilePicker()}
	>
		<input
			bind:this={fileInput}
			type="file"
			accept=".txt,text/plain"
			on:change={handleFileInput}
			style="display: none;"
		/>

		<div class="upload-content">
			{#if isUploading}
				<div class="loading-spinner"></div>
				<h3>Processing your chat...</h3>
				<p>Please wait while we parse your WhatsApp chat export</p>
			{:else}
				<div class="upload-icon">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none">
						<path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
				
				<h3>Upload WhatsApp Chat Export</h3>
				<p>Drag and drop your chat export file here, or click to browse</p>
				
				<div class="upload-instructions">
					<h4>How to export your WhatsApp chat:</h4>
					<ol>
						<li>Open WhatsApp on your phone</li>
						<li>Go to the chat you want to export</li>
						<li>Tap the chat name at the top</li>
						<li>Scroll down and tap "Export Chat"</li>
						<li>Choose "Without Media"</li>
						<li>Save the text file and upload it here</li>
					</ol>
				</div>

				<button class="browse-button" on:click|stopPropagation={openFilePicker}>
					Choose File
				</button>
			{/if}
		</div>
	</div>

	{#if uploadError}
		<div class="message error" role="alert">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
				<line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
				<line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
			</svg>
			<span>{uploadError}</span>
			<button class="close-button" on:click={clearMessages}>×</button>
		</div>
	{/if}

	{#if uploadSuccess}
		<div class="message success" role="alert">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4905 2.02168 11.3363C2.16356 9.18219 2.99721 7.13677 4.39828 5.49707C5.79935 3.85736 7.69279 2.71548 9.79619 2.24015C11.8996 1.76482 14.1003 1.98258 16.07 2.86" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<span>{uploadSuccess}</span>
			<button class="close-button" on:click={clearMessages}>×</button>
		</div>
	{/if}
</div>

<style>
	.upload-container {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		padding: var(--spacing-xl);
		max-width: 600px;
		margin: 0 auto;
	}

	.upload-area {
		border: 2px dashed var(--wa-gray-medium);
		border-radius: var(--radius-lg);
		padding: var(--spacing-xl);
		text-align: center;
		cursor: pointer;
		transition: all var(--transition-normal);
		background: var(--wa-white);
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.upload-area:hover,
	.upload-area:focus {
		border-color: var(--wa-green-primary);
		background-color: rgba(37, 211, 102, 0.02);
	}

	.upload-area.drag-over {
		border-color: var(--wa-green-primary);
		background-color: rgba(37, 211, 102, 0.05);
		transform: scale(1.02);
	}

	.upload-area.uploading {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-lg);
		max-width: 500px;
	}

	.upload-icon {
		color: var(--wa-gray-dark);
	}

	.upload-content h3 {
		margin: 0;
		color: var(--wa-text-primary);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.upload-content p {
		margin: 0;
		color: var(--wa-text-secondary);
		font-size: 1rem;
		line-height: 1.5;
	}

	.upload-instructions {
		background: var(--wa-gray-light);
		padding: var(--spacing-lg);
		border-radius: var(--radius-md);
		text-align: left;
		width: 100%;
	}

	.upload-instructions h4 {
		margin: 0 0 var(--spacing-md) 0;
		color: var(--wa-text-primary);
		font-size: 1rem;
		font-weight: 600;
	}

	.upload-instructions ol {
		margin: 0;
		padding-left: var(--spacing-lg);
		color: var(--wa-text-secondary);
		line-height: 1.6;
	}

	.upload-instructions li {
		margin-bottom: var(--spacing-xs);
	}

	.browse-button {
		background: var(--wa-green-primary);
		color: white;
		padding: var(--spacing-md) var(--spacing-xl);
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 500;
		transition: background-color var(--transition-fast);
	}

	.browse-button:hover {
		background: var(--wa-green-dark);
	}

	.message {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-lg);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		line-height: 1.4;
		position: relative;
	}

	.message.error {
		background: #fee;
		color: #c53030;
		border: 1px solid #fed7d7;
	}

	.message.success {
		background: #f0fff4;
		color: #2f855a;
		border: 1px solid #c6f6d5;
	}

	.close-button {
		position: absolute;
		top: var(--spacing-sm);
		right: var(--spacing-sm);
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 1.2rem;
		font-weight: bold;
		opacity: 0.7;
		transition: opacity var(--transition-fast);
	}

	.close-button:hover {
		opacity: 1;
	}

	@media (max-width: 767px) {
		.upload-container {
			padding: var(--spacing-lg);
		}

		.upload-area {
			padding: var(--spacing-lg);
			min-height: 300px;
		}

		.upload-content h3 {
			font-size: 1.25rem;
		}

		.upload-instructions {
			padding: var(--spacing-md);
		}
	}
</style>
