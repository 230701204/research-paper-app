/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export type BlockType = 'text' | 'image' | 'video' | 'youtube' | 'diagram' | 'timestamp' | 'ai-report' | 'predictor' | 'simulation' | 'search-researcher' | 'figma' | 'canva' | 'file-embed';

export interface ResearchBlock {
  id: string;
  type: BlockType;
  content: string; // text or url
  metadata?: {
    caption?: string;
    timestamp?: string;
    diagramType?: string;
    loop?: boolean;
    aspectRatio?: string;
    // File/Embed specific
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    // Predictor/Simulation specific
    parameters?: Record<string, any>;
    analysisResult?: string;
    searchQuery?: string;
  };
}

export interface ResearchPaper {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorRole?: string;
  themeColor: string;
  themeConfig?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  heroMedia: {
    type: 'none' | 'animation' | 'video' | 'youtube';
    url?: string;
    opacity?: number;
    config?: any;
  };
  blocks: ResearchBlock[];
  createdAt: number;
  updatedAt: number;
  ownerId: string;
}

export interface Laureate {
  name: string;
  image: string; // placeholder url
  role: string;
  desc: string;
}
