import log from './logger';

/**
 * Parsed message interface
 */
export interface ParsedMessage {
	timestamp: Date;
	sender: string;
	content: string;
}

/**
 * Chat metadata interface
 */
export interface ChatMetadata {
	name: string;
	participants: string[];
	messageCount: number;
	dateRange: {
		start: Date;
		end: Date;
	};
}

/**
 * High-performance WhatsApp chat parser with enterprise-grade optimization
 */
export class WhatsAppParser {
	private static readonly MESSAGE_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2})\s-\s(.+?):\s(.*)$/;
	private static readonly SYSTEM_MESSAGE_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2})\s-\s(.*)$/;

	/**
	 * Parse WhatsApp chat export text into structured data
	 */
	static parse(chatContent: string): {
		messages: ParsedMessage[];
		metadata: ChatMetadata;
	} {
		log.info('Parsing WhatsApp chat export text into structured data');
		const lines = chatContent.split('\n').filter(line => line.trim());
		const messages: ParsedMessage[] = [];
		const participantSet = new Set<string>();
		let currentMessage: ParsedMessage | null = null;
		
		for (const line of lines) {
			const messageMatch = line.match(this.MESSAGE_REGEX);
			const systemMatch = line.match(this.SYSTEM_MESSAGE_REGEX);
			
			if (messageMatch) {
				// Save previous message if exists
				if (currentMessage) {
					messages.push(currentMessage);
				}
				
				const [, date, time, sender, content] = messageMatch;
				const timestamp = this.parseDateTime(date, time);
				
				// Clean sender name (remove ~ prefix if present)
				const cleanSender = sender.replace(/^~\s/, '').trim();
				participantSet.add(cleanSender);
				
				currentMessage = {
					timestamp,
					sender: cleanSender,
					content: content.trim()
				};
			} else if (systemMatch) {
				// Handle system messages (like encryption notice)
				if (currentMessage) {
					messages.push(currentMessage);
					currentMessage = null;
				}
				
				const [, date, time, content] = systemMatch;
				const timestamp = this.parseDateTime(date, time);
				
				messages.push({
					timestamp,
					sender: 'System',
					content: content.trim()
				});
			} else if (currentMessage && line.trim()) {
				// Continuation of previous message (multiline)
				currentMessage.content += '\n' + line.trim();
			}
		}
		
		// Add last message if exists
		if (currentMessage) {
			messages.push(currentMessage);
		}
		
		// Generate chat metadata
		const participants = Array.from(participantSet).filter(p => p !== 'System');
		const chatName = this.generateChatName(participants, messages);
		
		const metadata: ChatMetadata = {
			name: chatName,
			participants,
			messageCount: messages.length,
			dateRange: {
				start: messages.length > 0 ? messages[0].timestamp : new Date(),
				end: messages.length > 0 ? messages[messages.length - 1].timestamp : new Date()
			}
		};
		
		return { messages, metadata };
	}

	/**
	 * Parse date and time string into Date object
	 */
	private static parseDateTime(dateStr: string, timeStr: string): Date {
		log.info('Parsing date and time string into Date object');
		// Handle different date formats (M/D/YY, MM/DD/YYYY, etc.)
		const [month, day, year] = dateStr.split('/').map(num => parseInt(num, 10));
		const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
		
		// Handle 2-digit years
		const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
		
		return new Date(fullYear, month - 1, day, hours, minutes);
	}

	/**
	 * Generate a meaningful chat name based on participants and content
	 */
	private static generateChatName(participants: string[], messages: ParsedMessage[]): string {
		log.info('Generating a meaningful chat name based on participants and content');
		if (participants.length === 0) {
			return 'Unknown Chat';
		}
		
		if (participants.length === 1) {
			return `${participants[0]} (Self Chat)`;
		}
		
		if (participants.length === 2) {
			return participants.join(' & ');
		}
		
		// For group chats, try to find a meaningful name from the first few messages
		const firstMessages = messages.slice(0, 10);
		const groupNamePattern = /added|created|changed.*subject|group/i;
		
		for (const message of firstMessages) {
			if (groupNamePattern.test(message.content)) {
				// Try to extract group name from system messages
				const subjectMatch = message.content.match(/subject.*?["']([^"']+)["']/i);
				if (subjectMatch) {
					return subjectMatch[1];
				}
			}
		}
		
		// Fallback to participant names
		if (participants.length <= 4) {
			return participants.join(', ');
		} else {
			return `${participants.slice(0, 3).join(', ')} and ${participants.length - 3} others`;
		}
	}

	/**
	 * Validate if the content looks like a WhatsApp chat export
	 */
	static validate(content: string): {
		isValid: boolean;
		errors: string[];
	} {
		log.info('Validating if the content looks like a WhatsApp chat export');
		const errors: string[] = [];
		
		if (!content || content.trim().length === 0) {
			errors.push('Content is empty');
			return { isValid: false, errors };
		}
		
		const lines = content.split('\n').filter(line => line.trim());
		
		if (lines.length === 0) {
			errors.push('No valid lines found');
			return { isValid: false, errors };
		}
		
		// Check if at least some lines match the expected format
		let validMessageCount = 0;
		let totalNonEmptyLines = 0;
		
		for (const line of lines.slice(0, Math.min(50, lines.length))) {
			if (line.trim()) {
				totalNonEmptyLines++;
				if (this.MESSAGE_REGEX.test(line) || this.SYSTEM_MESSAGE_REGEX.test(line)) {
					validMessageCount++;
				}
			}
		}
		
		const validRatio = validMessageCount / totalNonEmptyLines;
		
		if (validRatio < 0.3) {
			errors.push('Content does not appear to be a WhatsApp chat export');
			errors.push(`Only ${Math.round(validRatio * 100)}% of lines match expected format`);
		}
		
		if (validMessageCount === 0) {
			errors.push('No valid message format found');
			errors.push('Expected format: "MM/DD/YY, HH:MM - Sender: Message"');
		}
		
		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Extract chat preview information without full parsing
	 */
	static getPreview(content: string): {
		participantCount: number;
		messageCount: number;
		dateRange: string;
		firstFewMessages: ParsedMessage[];
	} {
		log.info('Extracting chat preview information without full parsing');
		const lines = content.split('\n').filter(line => line.trim()).slice(0, 20);
		const participants = new Set<string>();
		const messages: ParsedMessage[] = [];
		
		for (const line of lines) {
			const messageMatch = line.match(this.MESSAGE_REGEX);
			if (messageMatch) {
				const [, date, time, sender, messageContent] = messageMatch;
				const cleanSender = sender.replace(/^~\s/, '').trim();
				participants.add(cleanSender);
				
				if (messages.length < 5) {
					messages.push({
						timestamp: this.parseDateTime(date, time),
						sender: cleanSender,
						content: messageContent.trim()
					});
				}
			}
		}
		
		// Estimate total message count
		const totalLines = content.split('\n').filter(line => line.trim()).length;
		const estimatedMessageCount = Math.round(totalLines * 0.8); // Rough estimate
		
		return {
			participantCount: participants.size,
			messageCount: estimatedMessageCount,
			dateRange: messages.length > 0 ? 
				`${messages[0].timestamp.toLocaleDateString()} - ${messages[messages.length - 1].timestamp.toLocaleDateString()}` :
				'Unknown',
			firstFewMessages: messages
		};
	}
}
