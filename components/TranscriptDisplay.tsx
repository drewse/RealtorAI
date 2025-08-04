
'use client';

import { useState } from 'react';

interface TranscriptSegment {
  id: string;
  speaker: 'Agent' | 'Client' | 'Client2' | 'Unknown';
  text: string;
  startTime?: number;
  endTime?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence?: number;
}

interface SentimentAnalysis {
  sentence: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords?: string[];
}

interface KeywordFrequency {
  word: string;
  frequency: number;
  relevance: number;
  category?: 'property' | 'price' | 'concern' | 'positive' | 'negative';
  context?: string[];
}

interface TranscriptDisplayProps {
  transcript: string;
  loading?: boolean;
  // Enhanced analysis data
  transcriptSegments?: TranscriptSegment[];
  sentimentMap?: SentimentAnalysis[];
  keywordAnalysis?: KeywordFrequency[];
  speakers?: string[];
  overallSentiment?: 'positive' | 'neutral' | 'negative';
}

export default function TranscriptDisplay({ 
  transcript, 
  loading, 
  transcriptSegments = [],
  sentimentMap = [],
  keywordAnalysis = [],
  speakers = [],
  overallSentiment = 'neutral'
}: TranscriptDisplayProps) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis' | 'keywords'>('transcript');
  const [showSpeakers, setShowSpeakers] = useState(transcriptSegments.length > 0);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <h3 className="text-lg font-semibold text-white">Analyzing conversation...</h3>
        </div>
        <p className="text-gray-400">Transcribing audio, identifying speakers, and analyzing sentiment</p>
      </div>
    );
  }

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return 'text-green-400 bg-green-900/20 border-green-700/50';
      case 'negative': return 'text-red-400 bg-red-900/20 border-red-700/50';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700/50';
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'Agent': return 'text-blue-400 bg-blue-900/30';
      case 'Client': return 'text-purple-400 bg-purple-900/30';
      case 'Client2': return 'text-green-400 bg-green-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'property': return 'text-blue-400 bg-blue-900/30';
      case 'price': return 'text-yellow-400 bg-yellow-900/30';
      case 'concern': return 'text-red-400 bg-red-900/30';
      case 'positive': return 'text-green-400 bg-green-900/30';
      case 'negative': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const highlightKeywords = (text: string, keywords: KeywordFrequency[]) => {
    if (keywords.length === 0) return text;
    
    let highlightedText = text;
    const topKeywords = keywords.slice(0, 10); // Highlight top 10 keywords
    
    topKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, 
        `<mark class="bg-yellow-900/40 text-yellow-200 px-1 rounded">${keyword.word}</mark>`
      );
    });
    
    return highlightedText;
  };

  const getTopKeywords = (keywords: KeywordFrequency[], limit: number = 8) => {
    return keywords
      .sort((a, b) => (b.relevance * b.frequency) - (a.relevance * a.frequency))
      .slice(0, limit);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header with Overall Sentiment */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-file-text-line text-blue-500"></i>
          </div>
          <h3 className="text-lg font-semibold text-white">Conversation Analysis</h3>
        </div>
        
        {/* Overall Sentiment Indicator */}
        <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getSentimentColor(overallSentiment)}`}>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 flex items-center justify-center">
              <i className={`ri-${overallSentiment === 'positive' ? 'emotion-happy' : overallSentiment === 'negative' ? 'emotion-sad' : 'emotion-normal'}-line`}></i>
            </div>
            <span className="capitalize">{overallSentiment} Tone</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
            activeTab === 'transcript'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Transcript
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
            activeTab === 'analysis'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sentiment
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
            activeTab === 'keywords'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Keywords
        </button>
      </div>

      <div className="p-4">
        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            {/* Speaker Toggle */}
            {transcriptSegments.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Show speakers:</span>
                  <button
                    onClick={() => setShowSpeakers(!showSpeakers)}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap ${
                      showSpeakers ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {showSpeakers ? 'On' : 'Off'}
                  </button>
                </div>
                
                {/* Speaker Legend */}
                {showSpeakers && speakers.length > 1 && (
                  <div className="flex items-center space-x-2">
                    {speakers.map((speaker, index) => (
                      <div key={index} className={`px-2 py-1 rounded-full text-xs ${getSpeakerColor(speaker)}`}>
                        {speaker}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transcript Content */}
            <div className="bg-gray-900 rounded-lg p-4 max-h-80 overflow-y-auto">
              {showSpeakers && transcriptSegments.length > 0 ? (
                // Speaker-separated transcript
                <div className="space-y-3">
                  {transcriptSegments.map((segment, index) => (
                    <div key={index} className="flex space-x-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getSpeakerColor(segment.speaker)}`}>
                        {segment.speaker}
                      </div>
                      <div className="flex-1">
                        <p 
                          className="text-gray-300 text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: highlightKeywords(segment.text, keywordAnalysis)
                          }}
                        />
                        {/* Sentiment indicator for segment */}
                        <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${getSentimentColor(segment.sentiment)}`}>
                          {segment.sentiment}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Regular transcript
                <p 
                  className="text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightKeywords(transcript, keywordAnalysis)
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Sentiment Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Sentiment Distribution */}
              {['positive', 'neutral', 'negative'].map((sentiment) => {
                const count = sentimentMap.filter(s => s.sentiment === sentiment).length;
                const percentage = sentimentMap.length > 0 ? Math.round((count / sentimentMap.length) * 100) : 0;
                
                return (
                  <div key={sentiment} className={`p-3 rounded-lg border ${getSentimentColor(sentiment as any)}`}>
                    <div className="text-center">
                      <div className="text-lg font-bold">{percentage}%</div>
                      <div className="text-xs capitalize">{sentiment}</div>
                      <div className="text-xs opacity-75">({count} segments)</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Sentiment Analysis */}
            {sentimentMap.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Sentence-level Analysis</h4>
                <div className="space-y-2">
                  {sentimentMap.slice(0, 10).map((analysis, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`px-2 py-1 rounded text-xs ${getSentimentColor(analysis.sentiment)}`}>
                        {analysis.sentiment}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">{analysis.sentence}</p>
                        <div className="text-xs text-gray-500">Confidence: {Math.round(analysis.confidence * 100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keywords Analysis Tab */}
        {activeTab === 'keywords' && (
          <div className="space-y-4">
            {keywordAnalysis.length > 0 ? (
              <>
                {/* Top Keywords Grid */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Top Discussion Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {getTopKeywords(keywordAnalysis).map((keyword, index) => (
                      <div key={index} className={`px-3 py-2 rounded-lg border ${getCategoryColor(keyword.category)}`}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{keyword.word}</span>
                          <span className="text-xs opacity-75">×{keyword.frequency}</span>
                        </div>
                        <div className="text-xs opacity-75 capitalize">{keyword.category || 'general'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords by Category */}
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Detailed Keyword Analysis</h4>
                  <div className="space-y-3">
                    {keywordAnalysis.slice(0, 15).map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">{keyword.word}</span>
                          <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(keyword.category)}`}>
                            {keyword.category || 'general'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-400">
                          <span>×{keyword.frequency}</span>
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${keyword.relevance * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <i className="ri-search-line text-4xl text-gray-600"></i>
                </div>
                <h4 className="text-lg font-medium text-gray-400 mb-2">No Keywords Identified</h4>
                <p className="text-gray-500">Keyword analysis will appear here after processing</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
