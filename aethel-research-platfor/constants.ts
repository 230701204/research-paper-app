import { ResearchPaper } from './types';

export const ALPHA_QUBIT_PAPER: ResearchPaper = {
  id: 'alpha-qubit-default',
  title: 'AlphaQubit',
  subtitle: 'AI for Quantum Error Correction',
  author: 'Google Quantum AI',
  authorRole: 'November 2024 • Nature',
  themeColor: '#C5A059',
  heroMedia: {
    type: 'animation'
  },
  blocks: [
    {
      id: 'b1',
      type: 'text',
      content: '## The Noise Barrier\n\nBuilding a large-scale quantum computer requires correcting the errors that inevitably arise in physical systems. The state of the art is the **surface code**, which encodes information redundantly across many physical qubits.'
    },
    {
      id: 'b2',
      type: 'text',
      content: 'However, interpreting the noisy signals from these codes—a task called "decoding"—is a massive challenge. Complex noise effects like cross-talk and leakage confuse standard algorithms. **AlphaQubit** uses machine learning to learn these complex error patterns directly from the quantum processor, achieving accuracy far beyond human-designed algorithms.'
    },
    {
      id: 'b3',
      type: 'diagram',
      content: '',
      metadata: { diagramType: 'surface-code' }
    },
    {
      id: 'b4',
      type: 'text',
      content: '### Neural Decoding\n\nStandard decoders assume simple, independent errors. Real hardware is messier. AlphaQubit treats decoding as a sequence prediction problem, using a **Recurrent Transformer** architecture.'
    },
    {
      id: 'b5',
      type: 'diagram',
      content: '',
      metadata: { diagramType: 'transformer' }
    },
    {
       id: 'b6',
       type: 'text',
       content: 'It ingests the history of stabilizer measurements and uses "soft" analog information—probabilities rather than just binary 0s and 1s—to make highly informed predictions about logical errors.'
    },
    {
       id: 'b7',
       type: 'diagram',
       content: '',
       metadata: { diagramType: 'performance' }
    },
    {
       id: 'b8',
       type: 'predictor',
       content: 'Our initial analysis suggests a logical error rate of $10^{-6}$ is achievable within 2 years of hardware iterations.',
       metadata: { parameters: { gateError: '0.0005', topology: 'Square Lattice' } }
    },
    {
       id: 'b9',
       type: 'simulation',
       content: 'run_surface_code_sim(distance=7, error_rate=0.001)',
       metadata: { parameters: { iterations: 10000, complexity: 'O(n^3)' } }
    },
    {
       id: 'b10',
       type: 'timestamp',
       content: 'Detailed explanation of the syndrome extraction circuit.',
       metadata: { timestamp: '12:45' }
    },
    {
       id: 'b11',
       type: 'youtube',
       content: 'https://www.youtube.com/watch?v=6v2L2UGZJAM',
       metadata: { caption: 'Quantum Error Correction Explained' }
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ownerId: 'system'
};
