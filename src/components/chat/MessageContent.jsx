import React from 'react';
import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';

const MessageContent = ({ content }) => {
    // Regex to find instagram.com URLs, including optional query parameters like igsh
    const instagramRegex = /(instagram\.com\/[a-zA-Z0-9_.-]+)(\?igsh=[a-zA-Z0-9_.-]*)?/i;
    const match = content.match(instagramRegex);

    // If no link is found, render plain text
    if (!match) {
        return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    }

    const matchedUrlPart = match[0]; // The full matched URL part, e.g., "instagram.com/user?igsh=..."
    const fullUrl = `https://${matchedUrlPart}`;
    
    // Split the content by the full matched URL to get the text before and after
    const parts = content.split(matchedUrlPart);
    const beforeText = parts[0];
    const afterText = parts[1] || ''; // Handle cases where the URL is at the end of the string

    return (
        <div className="text-sm whitespace-pre-wrap">
            {beforeText}
            <Button
                asChild
                variant="link"
                size="sm"
                className="p-0 h-auto text-rose-600 hover:text-rose-800 font-medium underline underline-offset-2"
            >
                <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                    <Instagram className="w-4 h-4" />
                    צפייה באינסטגרם
                </a>
            </Button>
            {afterText}
        </div>
    );
};

export default MessageContent;