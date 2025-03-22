import Colors from './Colors';
import Layout from './Layout';

export default {
  colors: Colors,
  layout: Layout,
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      elevation: 6,
    }
  }
};