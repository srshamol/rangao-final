import { useFBPixelInit, useFBPageView, useFBCustomEvents } from "@/hooks/useFBPixel";

const FBPixelProvider = () => {
  useFBPixelInit();
  useFBPageView();
  useFBCustomEvents();
  return null;
};

export default FBPixelProvider;
