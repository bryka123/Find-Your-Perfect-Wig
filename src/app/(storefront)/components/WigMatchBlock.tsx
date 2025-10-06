'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { MatchRequest, VariantMatch, SelfieAttributes } from '@/lib/types';
import { ColorChipGenerator } from '@/lib/color-chips';

interface WigMatchBlockProps {
  className?: string;
  theme?: 'light' | 'dark';
  maxResults?: number;
  showFilters?: boolean;
}

export default function WigMatchBlock({
  className = '',
  theme = 'light',
  maxResults = 6,
  showFilters = true
}: WigMatchBlockProps) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<VariantMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [showCaptureTips, setShowCaptureTips] = useState(false);

  // Filters state
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);

  // React Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('🔄 Processing file:', file.name, file.type, file.size);

    setSelfieFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('✅ Preview created, length:', result?.length);
      setSelfiePreview(result);
    };
    reader.onerror = () => {
      console.error('❌ FileReader error');
      setError('Failed to load image preview');
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic', '.heif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    noClick: false,
    noKeyboard: false
  });

  // Handle file rejection errors
  useEffect(() => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('Image must be smaller than 10MB');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Please upload an image file (JPG, PNG, HEIC, WEBP)');
      } else {
        setError('Invalid file. Please try another image.');
      }
    }
  }, [fileRejections]);

  const simulateProgress = useCallback((stages: string[]) => {
    setProgress(0);
    setProcessingStage(stages[0] || 'Processing...');

    let currentStage = 0;
    const maxProgress = 95; // Cap at 95% until actually complete
    const progressPerStage = maxProgress / stages.length;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Calculate target progress for current stage
        const targetProgress = Math.min((currentStage + 1) * progressPerStage, maxProgress);
        const increment = (targetProgress - prev) / 10;
        const newProgress = Math.min(prev + Math.max(increment, 0.5), maxProgress);

        // Move to next stage when appropriate
        if (newProgress >= (currentStage + 1) * progressPerStage && currentStage < stages.length - 1) {
          currentStage++;
          setProcessingStage(stages[currentStage]);
        }

        return newProgress;
      });
    }, 300);

    return progressInterval;
  }, []);

  const getBadgeType = (match: VariantMatch, index: number): string | null => {
    // Enhanced reasons include detailed scoring info
    const reasons = match.reasons.join(' ').toLowerCase();
    
    if (reasons.includes('excellent color match') || reasons.includes('δe:')) {
      return 'exact-shade';
    } else if (reasons.includes('good color') || reasons.includes('color match')) {
      return 'closest-shade';
    } else if (reasons.includes('alternative style')) {
      return 'alt-style';
    } else if (index === 0) {
      return 'top-match';
    }
    
    return null;
  };

  const getBadgeText = (badgeType: string): string => {
    switch (badgeType) {
      case 'exact-shade': return 'Exact Shade';
      case 'closest-shade': return 'Closest Shade';
      case 'alt-style': return 'Alt Style';
      case 'top-match': return 'Top Match';
      default: return '';
    }
  };

  const getBadgeColor = (badgeType: string): string => {
    switch (badgeType) {
      case 'exact-shade': return '#4caf50'; // Green
      case 'closest-shade': return '#2196f3'; // Blue  
      case 'alt-style': return '#ff9800'; // Orange
      case 'top-match': return '#e91e63'; // Pink
      default: return '#666';
    }
  };

  const handleSearch = async () => {
    if (!selfieFile) {
      setError('Please upload a selfie');
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Start progress simulation (cap at 95% until actually complete)
      const progressStages = ['🤖 Advanced AI analyzing your features...', '👤 Face shape detection...', '🎨 Color harmony analysis...', '👁️ Visual style matching...', '🎯 Finding perfect matches...', '✨ Curating results...'];

      progressInterval = simulateProgress(progressStages);

      // Use Advanced AI matching with comprehensive analysis
      setProcessingStage('🤖 Advanced AI analyzing your features...');

      // FIRST: Try visual color swatch matching for accurate color detection
      console.log('🎨 Trying visual color swatch matching first...');
      const visualColorResponse = await fetch('/api/visual-color-match', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: selfiePreview,
              maxResults: maxResults
            }),
          });

          let responseToUse = visualColorResponse;
          let matchingMethod = 'visual-color-swatch';

          // Fallback chain: visual-color -> advanced -> visual
          if (!visualColorResponse.ok) {
            console.log('⚠️ Visual color match failed, trying advanced match...');
            matchingMethod = 'advanced';

            const advancedMatchResponse = await fetch('/api/advanced-match', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageData: selfiePreview,
                additionalContext: additionalDescription || '',
                limit: maxResults,
                filters: {
                  priceRange: priceRange.min > 0 || priceRange.max < 1000 ? priceRange : undefined,
                  colors: selectedColors.length > 0 ? selectedColors : undefined,
                  lengths: selectedLengths.length > 0 ? selectedLengths : undefined,
                  availableOnly: true
                }
              }),
            });

            if (!advancedMatchResponse.ok) {
              console.log('⚠️ Advanced match failed, falling back to visual-match...');
              matchingMethod = 'visual-match';
              responseToUse = await fetch('/api/visual-match', {
                method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userImageData: selfiePreview,
                maxResults: maxResults,
                userPreferences: additionalDescription || 'dynamic hair color analysis'
              }),
              });
            } else {
              responseToUse = advancedMatchResponse;
            }
          }

          if (!responseToUse.ok) {
            const errorData = await responseToUse.json();
            throw new Error(errorData.error || 'AI matching failed');
          }

          const responseData = await responseToUse.json();
          const aiMatches = responseData.matches || [];
          
          console.log(`✅ Received matches via ${matchingMethod}:`, aiMatches);

          // Clear progress interval and set to actual 100%
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
          setProgress(100);
          setProcessingStage('Complete');
          
          setTimeout(() => {
            // Convert AI matches to display format
            const convertedMatches = aiMatches.map((match: any) => {
              // Debug logging for specific products
              if (match.title.includes('16 On Key') || match.title.includes('Love Wave')) {
                console.log(`\n🖥️ FRONTEND RECEIVED "${match.title}":`);
                console.log(`   match.colorCode: "${match.colorCode}"`);
                console.log(`   match.colorName: "${match.colorName}"`);
                console.log(`   Will use: "${match.colorName || match.colorCode || 'Unknown'}"`);
              }

              return {
                variant: {
                  id: match.id,
                  productId: match.id,
                  title: match.title.toUpperCase(), // Convert to uppercase
                  price: match.price,
                  compareAtPrice: undefined,
                  availableForSale: true,
                  productUrl: match.handle ? `https://chiquel.com/products/${match.handle}` : null,
                  image: match.image ? {
                    url: match.image.url,
                    altText: match.image.altText || match.title
                  } : undefined,
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: (match.colorName || match.colorCode || 'Unknown').toUpperCase()
                    }
                  ],
                  vendor: (match.vendor || 'Chiquel').toUpperCase(),
                  wigAttributes: {
                    length: 'dynamic',
                    texture: 'dynamic',
                    color: 'chatgpt_determined',
                    capSize: 'average',
                    capConstruction: 'lace_front',
                    density: 'medium',
                    hairType: 'synthetic',
                    style: 'classic'
                  }
                },
                score: match.matchScore,
                reasons: match.reasons
              };
            }).filter((match: any) => !match.variant.title.includes('(') && !match.variant.title.includes(')')); // Filter out products with brackets
            
            setMatches(convertedMatches);
            
            // Analysis results are available in responseData but not displayed anymore
            
            setShowResults(true);
            setLoading(false);
            setProgress(0);
            setProcessingStage('');
          }, 500);

    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to find matches');
      setMatches([]);
      
      // Clear progress on error
      if (progressInterval) clearInterval(progressInterval);
      setProgress(0);
      setProcessingStage('');
      setLoading(false);
    }
  };

  const clearSelfie = () => {
    setSelfieFile(null);
    setSelfiePreview(null);
    setError(null);
  };

  const handleColorToggle = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handleLengthToggle = (length: string) => {
    setSelectedLengths(prev => 
      prev.includes(length) 
        ? prev.filter(l => l !== length)
        : [...prev, length]
    );
  };

  const resetSearch = () => {
    setShowResults(false);
    setMatches([]);
    setError(null);
    setSelfieFile(null);
    setSelfiePreview(null);
    setAdditionalDescription('');
    setSelectedColors([]);
    setSelectedLengths([]);
    setPriceRange({ min: 0, max: 1000 });
    setProgress(0);
    setProcessingStage('');
  };

  return (
    <div className={`wig-match-block ${theme} ${className}`}>
      <style jsx>{`
        .wig-match-block {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .wig-match-block.light {
          background: #ffffff;
          color: #333333;
        }
        
        .wig-match-block.dark {
          background: #1a1a1a;
          color: #ffffff;
        }

        .search-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .search-header h2 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #e91e63;
        }

        .search-header p {
          opacity: 0.7;
          margin-bottom: 2rem;
        }

        .search-type-toggle {
          display: flex;
          background: #f5f5f5;
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 2rem;
          max-width: 300px;
          margin-left: auto;
          margin-right: auto;
        }

        .search-type-toggle button {
          flex: 1;
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .search-type-toggle button.active {
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          color: #e91e63;
        }

        .search-form {
          background: #f9f9f9;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .dark .search-form {
          background: #2a2a2a;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .text-input, .file-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .text-input:focus {
          outline: none;
          border-color: #e91e63;
        }

        .file-upload-area {
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #fafafa;
        }

        .file-upload-area:hover {
          border-color: #e91e63;
          background: rgba(233, 30, 99, 0.05);
          transform: translateY(-2px);
        }

        .file-upload-area.drag-active {
          border-color: #e91e63;
          background: rgba(233, 30, 99, 0.1);
          transform: scale(1.02);
        }

        .file-upload-area.has-file {
          border-color: #4caf50;
          background: rgba(76, 175, 80, 0.05);
        }

        .file-preview {
          position: relative;
          margin-top: 1rem;
        }

        .file-preview img {
          max-width: 150px;
          max-height: 150px;
          border-radius: 8px;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .file-preview-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          line-height: 1;
        }

        .capture-tips {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          margin-top: 1rem;
        }

        .capture-tips h4 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
        }

        .capture-tips ul {
          margin: 0;
          padding-left: 1.5rem;
          list-style-type: none;
        }

        .capture-tips li {
          margin-bottom: 0.5rem;
          position: relative;
        }

        .capture-tips li:before {
          content: "💡";
          position: absolute;
          left: -1.5rem;
        }

        .tips-toggle {
          background: none;
          border: 1px solid #ddd;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 1rem;
          transition: all 0.2s;
        }

        .tips-toggle:hover {
          background: #f5f5f5;
          border-color: #e91e63;
        }

        .progress-container {
          margin: 2rem 0;
          padding: 2rem 1.5rem;
          background: #f9f9f9;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .dark .progress-container {
          background: #2a2a2a;
        }

        .circular-progress {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 1rem 0;
        }

        .circular-progress svg {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .circular-progress-bg {
          fill: none;
          stroke: #e0e0e0;
          stroke-width: 8;
        }

        .circular-progress-fill {
          fill: none;
          stroke: url(#progressGradient);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.3s ease;
        }

        .progress-percentage {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          font-weight: 700;
          color: #e91e63;
        }

        @keyframes spin-slow {
          0% { transform: rotate(-90deg); }
          100% { transform: rotate(270deg); }
        }

        .circular-progress.animating svg {
          animation: spin-slow 2s linear infinite;
        }

        .progress-text {
          font-weight: 500;
          color: #e91e63;
          margin-top: 0.5rem;
          text-align: center;
        }

        .progress-stage {
          font-size: 14px;
          color: #666;
          text-align: center;
          margin-top: 0.5rem;
        }

        .filters-section {
          margin-bottom: 1.5rem;
        }

        .filter-group {
          margin-bottom: 1rem;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .filter-chip {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .filter-chip.selected {
          background: #e91e63;
          color: white;
          border-color: #e91e63;
        }

        .price-range {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 0.5rem;
        }

        .price-input {
          width: 100px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .search-button {
          width: 100%;
          padding: 16px 24px;
          background: #e91e63;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .search-button:hover:not(:disabled) {
          background: #c2185b;
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .results-section {
          margin-top: 2rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .color-analysis {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .result-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          position: relative;
          border: 2px solid transparent;
          display: block;
          text-decoration: none;
          color: inherit;
        }

        .dark .result-card {
          background: #2a2a2a;
        }

        .result-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 32px rgba(233, 30, 99, 0.25);
          border-color: rgba(233, 30, 99, 0.5);
          cursor: pointer;
        }

        .result-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          z-index: 2;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .result-score {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
        }

        .result-image {
          width: 100%;
          aspect-ratio: 2/3;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
        }

        .result-content {
          padding: 1rem;
        }

        .result-title {
          font-weight: 600;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }

        .result-price {
          font-size: 1.25rem;
          font-weight: bold;
          color: #e91e63;
          margin-bottom: 0.5rem;
        }

        .result-reasons {
          margin-top: 0.5rem;
        }

        .result-reasons ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .result-reasons li {
          font-size: 14px;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .result-reasons li:before {
          content: "✓ ";
          color: #4caf50;
        }

        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #e91e63;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .reset-button {
          background: #666;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        }

        .reset-button:hover {
          background: #555;
        }

        /* User photo display on results */
        .user-photo-section {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
          border-radius: 12px;
        }

        .user-photo-container {
          flex: 0 0 auto;
          text-align: center;
        }

        .user-photo-label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: ${theme === 'dark' ? '#fff' : '#333'};
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }

        .user-photo-frame {
          width: 150px;
          height: 150px;
          border-radius: 12px;
          overflow: hidden;
          border: 3px solid #e91e63;
          box-shadow: 0 4px 12px rgba(233, 30, 99, 0.2);
          position: relative;
        }

        .user-photo-frame::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .arrow-indicator {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          height: 150px;
          font-size: 2.5rem;
          color: #e91e63;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .results-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }

          .user-photo-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .arrow-indicator {
            transform: rotate(90deg);
            height: 40px;
            margin: 1rem 0;
          }
        }

        @media (max-width: 768px) {
          .user-photo-section {
            padding: 1rem;
            gap: 1rem;
          }

          .user-photo-frame {
            width: 120px;
            height: 120px;
          }
          .wig-match-block {
            padding: 1rem;
          }

          .search-header h2 {
            font-size: 1.75rem;
          }

          .results-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
          }

          .price-range {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }

          .filter-chips {
            gap: 0.25rem;
          }

          .filter-chip {
            font-size: 12px;
            padding: 4px 8px;
          }

          .file-upload-area {
            padding: 1.5rem;
            min-height: 150px;
          }

          .capture-tips {
            padding: 1rem;
          }

          .progress-container {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .wig-match-block {
            padding: 0.5rem;
          }

          .search-header h2 {
            font-size: 1.5rem;
          }

          .search-header p {
            font-size: 14px;
          }

          .results-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .result-card {
            margin: 0;
          }

          .search-type-toggle {
            max-width: 250px;
          }

          .search-type-toggle button {
            padding: 10px 16px;
            font-size: 14px;
          }

          .file-upload-area {
            padding: 1rem;
            min-height: 120px;
          }

          .capture-tips ul {
            padding-left: 1rem;
          }

          .capture-tips li {
            font-size: 14px;
          }
        }

        /* Accessibility enhancements */
        @media (prefers-reduced-motion: reduce) {
          .result-card,
          .file-upload-area,
          .progress-fill,
          .filter-chip,
          .search-button {
            transition: none !important;
          }

          .progress-fill::after {
            animation: none !important;
          }
        }

        .wig-match-block:focus-within .search-button {
          box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.3);
        }

        .result-card:focus {
          outline: 2px solid #e91e63;
          outline-offset: 2px;
        }

        .filter-chip:focus {
          outline: 2px solid #e91e63;
          outline-offset: 2px;
        }

        .file-upload-area:focus {
          outline: 2px solid #e91e63;
          outline-offset: 2px;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .result-card {
            border: 2px solid;
          }

          .result-badge {
            border: 1px solid;
          }

          .filter-chip {
            border-width: 2px;
          }
        }
      `}</style>

      <div className="search-header">
        <h2>Find Your Perfect Wig</h2>
        <p>Discover wigs that match your style and features using AI-powered recommendations</p>
      </div>

      {!showResults && (
        <>

          <div className="search-form">
            <div className="input-group">
                <label>Upload your selfie for personalized recommendations</label>
                <div
                  {...getRootProps()}
                  className={`file-upload-area ${selfieFile ? 'has-file' : ''} ${isDragActive ? 'drag-active' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload selfie image"
                >
                  <input {...getInputProps()} aria-describedby="file-help" />
                  {selfieFile && selfiePreview ? (
                    <div className="file-preview">
                      <img
                        src={selfiePreview}
                        alt={`Preview of ${selfieFile.name}`}
                        width="150"
                        height="150"
                      />
                      <button
                        className="file-preview-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSelfie();
                        }}
                        aria-label="Remove uploaded image"
                        type="button"
                      >
                        ×
                      </button>
                      <p style={{ marginTop: '0.5rem', fontSize: '14px' }}>
                        ✓ {selfieFile.name}
                      </p>
                      <small>Click to change photo</small>
                    </div>
                  ) : isDragActive ? (
                    <div>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                      <p><strong>Drop your selfie here</strong></p>
                      <small>Release to upload</small>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
                      <p><strong>Click to upload your selfie</strong></p>
                      <small>or drag and drop here</small>
                      <div style={{ margin: '1rem 0', fontSize: '12px', opacity: 0.7 }}>
                        JPG, PNG, HEIC, or WEBP • Max 10MB
                      </div>
                    </div>
                  )}
                </div>
                
                <div id="file-help" style={{ fontSize: '12px', marginTop: '0.5rem', opacity: 0.7 }}>
                  For best results, use a well-lit photo with your face and hair clearly visible
                </div>

                <button
                  className="tips-toggle"
                  onClick={() => setShowCaptureTips(!showCaptureTips)}
                  type="button"
                >
                  {showCaptureTips ? 'Hide' : 'Show'} Photo Tips
                </button>

                {showCaptureTips && (
                  <div className="capture-tips">
                    <h4>📸 Perfect Selfie Tips</h4>
                    <ul>
                      <li>Use natural lighting (near a window works best)</li>
                      <li>Face the camera directly with hair fully visible</li>
                      <li>Avoid shadows on your face and hair</li>
                      <li>Remove hats, headbands, or hair accessories</li>
                      <li>Use a neutral background if possible</li>
                      <li>Ensure your whole face is in frame</li>
                    </ul>
                  </div>
                )}
              </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="search-button"
              onClick={handleSearch}
              disabled={loading || !selfieFile}
              aria-describedby={loading ? "search-progress" : undefined}
            >
              {loading ? 'Finding Matches...' : 'Find My Perfect Wig'}
            </button>
            
            {loading && (
              <div className="progress-container" id="search-progress">
                <div className={`circular-progress ${progress < 100 ? 'animating' : ''}`}>
                  <svg viewBox="0 0 120 120">
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e91e63" />
                        <stop offset="100%" stopColor="#f06292" />
                      </linearGradient>
                    </defs>
                    <circle
                      className="circular-progress-bg"
                      cx="60"
                      cy="60"
                      r="52"
                    />
                    <circle
                      className="circular-progress-fill"
                      cx="60"
                      cy="60"
                      r="52"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                    />
                  </svg>
                  <div className="progress-percentage">
                    {Math.round(progress)}%
                  </div>
                </div>
                <div className="progress-stage">{processingStage}</div>
              </div>
            )}
          </div>
        </>
      )}

      {showResults && (
        <div className="results-section">
          <div className="results-header">
            <h3>Your Wig Matches ({matches.length})</h3>
            <button className="reset-button" onClick={resetSearch}>
              New Search
            </button>
          </div>

          {/* Display uploaded selfie with enhanced styling */}
          {selfiePreview && (
            <div className="user-photo-section">
              <div className="user-photo-container">
                <div className="user-photo-label">
                  <span>👤</span>
                  <span>Your Photo</span>
                </div>
                <div className="user-photo-frame">
                  <img
                    src={selfiePreview}
                    alt="Your uploaded selfie"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'relative',
                      zIndex: 1
                    }}
                  />
                </div>
                {additionalDescription && (
                  <div style={{
                    marginTop: '0.75rem',
                    fontSize: '13px',
                    color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    maxWidth: '150px',
                    fontStyle: 'italic'
                  }}>
                    “{additionalDescription}”
                  </div>
                )}
              </div>

              {/* Animated arrow indicator */}
              <div className="arrow-indicator">
                ➤
              </div>

              {/* Match summary */}
              <div style={{
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: '200px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: theme === 'dark' ? '#fff' : '#333'
                }}>
                  AI Analysis Complete
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                  marginBottom: '1rem',
                  lineHeight: '1.5'
                }}>
                  We've analyzed your photo and found {matches.length} perfect matches based on your unique features and style preferences.
                </p>
                {matches.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      background: 'rgba(233, 30, 99, 0.1)',
                      color: '#e91e63',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      Top Match: {Math.round(matches[0].score * 100)}%
                    </span>
                    {matches[0].variant.selectedOptions?.find(o => o.name.toLowerCase().includes('color'))?.value && (
                      <span style={{
                        background: 'rgba(76, 175, 80, 0.1)',
                        color: '#4caf50',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '13px'
                      }}>
                        Color: {matches[0].variant.selectedOptions.find(o => o.name.toLowerCase().includes('color'))?.value}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : matches.length > 0 ? (
            <div className="results-grid">
              {matches.map((match, index) => {
                const badgeType = getBadgeType(match, index);
                const badgeText = badgeType ? getBadgeText(badgeType) : null;
                const badgeColor = badgeType ? getBadgeColor(badgeType) : null;
                
                const productUrl = match.variant.productUrl || `https://chiquel.com/products/${match.variant.title.toLowerCase().replace(/\s+/g, '-')}`;

                return (
                  <a
                    key={match.variant.id}
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="result-card"
                    role="article"
                    aria-labelledby={`result-title-${index}`}
                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    {badgeText && (
                      <div 
                        className="result-badge"
                        style={{ backgroundColor: badgeColor! }}
                        aria-label={`${badgeText} recommendation`}
                      >
                        {badgeText}
                      </div>
                    )}
                    
                    <div 
                      className="result-score"
                      aria-label={`Match score: ${Math.round(match.score * 100)}%`}
                    >
                      {Math.round(match.score * 100)}%
                    </div>
                    
                    <div className="result-image">
                      {match.variant.image && match.variant.image.url ? (
                        <img 
                          src={match.variant.image.url} 
                          alt={match.variant.image.altText || match.variant.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                          crossOrigin="anonymous"
                          onLoad={() => {
                            console.log('✅ Product image loaded successfully:', match.variant.image?.url);
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            const originalSrc = img.src;
                            console.log('❌ Product image failed, trying color chip fallback:', originalSrc);
                            
                            // Try color chip as fallback
                            const colorValue = match.variant.selectedOptions.find(opt => 
                              opt.name.toLowerCase().includes('color')
                            )?.value;
                            
                            if (colorValue) {
                              const colorChipUrl = ColorChipGenerator.generateColorChipUrl(colorValue);
                              console.log('🎨 Trying color chip:', colorChipUrl);
                              img.src = colorChipUrl;
                              img.style.objectFit = 'cover';
                              return;
                            }
                            
                            // Final fallback to styled placeholder
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);">
                                  <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎨</div>
                                  <div>${colorValue || 'Wig Color'}</div>
                                  <div style="font-size: 12px; margin-top: 0.5rem; opacity: 0.7;">
                                    Color Swatch
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        // No product image available, show color chip instead
                        <img 
                          src={(() => {
                            const colorValue = match.variant.selectedOptions.find(opt => 
                              opt.name.toLowerCase().includes('color')
                            )?.value;
                            return ColorChipGenerator.generateColorChipUrl(colorValue || 'natural');
                          })()}
                          alt={`${match.variant.selectedOptions.find(opt => 
                            opt.name.toLowerCase().includes('color')
                          )?.value || 'Color'} swatch`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                          onLoad={() => {
                            console.log('✅ Color chip loaded as fallback');
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent) {
                              const colorValue = match.variant.selectedOptions.find(opt => 
                                opt.name.toLowerCase().includes('color')
                              )?.value || 'Color';
                              
                              parent.innerHTML = `
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px; background: linear-gradient(135deg, #f8f8f8 0%, #e0e0e0 100%); border: 2px dashed #ddd;">
                                  <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎨</div>
                                  <div style="font-weight: 500;">${colorValue}</div>
                                  <div style="font-size: 12px; margin-top: 0.5rem; opacity: 0.7;">
                                    Color Preview
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      )}
                    </div>
                    
                    <div className="result-content">
                      <h3 id={`result-title-${index}`} className="result-title">
                        {match.variant.title}
                      </h3>

                      {/* Vendor Name */}
                      {match.variant.vendor && (
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#666',
                          marginTop: '-0.25rem',
                          marginBottom: '0.5rem',
                          letterSpacing: '0.5px'
                        }}>
                          {match.variant.vendor}
                        </div>
                      )}

                      {/* Color Chip */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        marginBottom: '0.75rem' 
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem' 
                        }}>
                          <div style={{ position: 'relative' }}>
                            <img
                              src={(() => {
                                const colorValue = match.variant.selectedOptions.find(opt => 
                                  opt.name.toLowerCase().includes('color')
                                )?.value || match.variant.wigAttributes.color;
                                return ColorChipGenerator.generateColorChipUrl(colorValue, match.variant.title);
                              })()}
                              alt={`${match.variant.selectedOptions.find(opt => 
                                opt.name.toLowerCase().includes('color')
                              )?.value || match.variant.wigAttributes.color} color chip`}
                              style={{ 
                                width: '64px', 
                                height: '64px', 
                                borderRadius: '8px',
                                border: '2px solid #fff',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                // Fallback to solid color if color chip image fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement!;
                                const fallbackDiv = document.createElement('div');
                                fallbackDiv.style.cssText = `
                                  width: 64px; 
                                  height: 64px; 
                                  border-radius: 8px;
                                  border: 2px solid #fff;
                                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                                  background: ${(() => {
                                    const colorValue = match.variant.selectedOptions.find(opt => 
                                      opt.name.toLowerCase().includes('color')
                                    )?.value || match.variant.wigAttributes.color;
                                    const colorChip = ColorChipGenerator.generateColorChip(colorValue, match.variant.title);
                                    return ColorChipGenerator.getColorChipBackground(colorChip);
                                  })()};
                                `;
                                parent.appendChild(fallbackDiv);
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>
                              {match.variant.selectedOptions.find(opt => 
                                opt.name.toLowerCase().includes('color')
                              )?.value || match.variant.wigAttributes.color}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              {(() => {
                                const colorValue = match.variant.selectedOptions.find(opt => 
                                  opt.name.toLowerCase().includes('color')
                                )?.value || match.variant.wigAttributes.color;
                                const colorChip = ColorChipGenerator.generateColorChip(colorValue, match.variant.title);
                                return colorChip.description;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="result-price">
                        <span className="current-price" aria-label={`Current price: $${match.variant.price}`}>
                          ${match.variant.price}
                        </span>
                        {match.variant.compareAtPrice && (
                          <span 
                            className="compare-price"
                            style={{ 
                              textDecoration: 'line-through', 
                              color: '#999', 
                              marginLeft: '0.5rem',
                              fontSize: '0.9em'
                            }}
                            aria-label={`Original price: $${match.variant.compareAtPrice}`}
                          >
                            ${match.variant.compareAtPrice}
                          </span>
                        )}
                      </div>
                      
                      {match.reasons.length > 0 && (
                        <div className="result-reasons">
                          <h4 style={{ 
                            fontSize: '14px', 
                            margin: '0.5rem 0 0.25rem 0', 
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            Why this matches:
                          </h4>
                          <ul>
                            {match.reasons.map((reason, reasonIndex) => (
                              <li key={reasonIndex}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
              <p>No matches found. Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
