import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';

interface SaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (portfolioName: string) => void;
    initialName?: string;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave, initialName }) => {
    const [portfolioName, setPortfolioName] = useState(initialName || '');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus the input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    /**
     * Handle save action - validates and triggers save callback
     */
    const handleSave = (): void => {
        if (portfolioName.trim()) {
            onSave(portfolioName.trim());
            setPortfolioName('');
        }
    };

    /**
     * Handle keyboard events for better UX
     */
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Save Portfolio</DialogTitle>
                </DialogHeader>

                <div className="grid gap-2">
                    <Label htmlFor="portfolio-name">Portfolio Name</Label>
                    <Input
                        ref={inputRef}
                        id="portfolio-name"
                        type="text"
                        value={portfolioName}
                        onChange={(e) => setPortfolioName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Enter a name for your portfolio"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!portfolioName.trim()}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SaveModal;
