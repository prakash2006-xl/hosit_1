// Mock MapView components for web platform
import { View } from 'react-native';

export const MapView = ({ children, ...props }) => {
    return <View {...props}>{children}</View>;
};

export const Marker = ({ children, ...props }) => {
    return <View {...props}>{children}</View>;
};

export const Callout = ({ children, ...props }) => {
    return <View {...props}>{children}</View>;
};

export default MapView;
