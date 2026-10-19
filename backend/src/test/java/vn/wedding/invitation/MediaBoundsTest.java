package vn.wedding.invitation;
import java.awt.image.BufferedImage;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.media.MediaService;
import static org.junit.jupiter.api.Assertions.*;
class MediaBoundsTest {
 @Test void boundsDimensionsWithoutUpscaling(){var image=MediaService.boundedImage(new BufferedImage(3000,1500,BufferedImage.TYPE_INT_RGB));assertEquals(2400,image.getWidth());assertEquals(1200,image.getHeight());var small=MediaService.boundedImage(new BufferedImage(100,50,BufferedImage.TYPE_INT_RGB));assertEquals(100,small.getWidth());}
 @Test void flattensTransparencyOnWhite(){var image=MediaService.boundedImage(new BufferedImage(2,2,BufferedImage.TYPE_INT_ARGB));assertEquals(0xffffff,image.getRGB(0,0)&0xffffff);assertEquals(BufferedImage.TYPE_INT_RGB,image.getType());}
}