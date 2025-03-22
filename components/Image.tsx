import React from 'react';
import { Image as RNImage, ImageProps, StyleSheet } from 'react-native';
import Theme from '@/constants/Theme';

interface CustomImageProps extends ImageProps {
  size?: number;
  rounded?: boolean;
}

export function Image({ 
  size, 
  rounded,
  style,
  ...props 
}: CustomImageProps) {
  return (
    <RNImage
      {...props}
      style={[
        styles.image,
        size && { width: size, height: size },
        rounded && { borderRadius: Theme.layout.borderRadius.full },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'contain',
  },
});

export default Image;