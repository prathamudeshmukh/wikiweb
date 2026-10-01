// Official test setup for the gesture and animation libraries, so screens that use them can render under Jest.
import 'react-native-gesture-handler/jestSetup';
import { setUpTests } from 'react-native-reanimated';

setUpTests();
