import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileFilter;
import java.io.IOException;
import java.util.HashMap;
import java.util.Random;

public class ImageGeneratorPrimary {

    // The size of the card images
    private static int cardWidth = 140;
    private static int cardHeight = 190;

    // The minimum space between cards.  This should be large enough that you can always see the suit and number on the top left of the card
    private static int cardMinSpacing = 36;

    // The width of the output image
    private static int baseImageWidth = 296;

    // How much random vertical positioning randomness to add
    private static int randomHeight = 10;

    // How large the padding around the edge of the image should be
    private static int padding = 10;

    // How many cards to wrap after
    private static int wrapAfter = 10;

    // How far down to place each row from the last
    private static int rowVerticalSpacing = 60;

    // How far to the side to place each subsequent row
    private static int rowHorizontalSpacing =  20;

    // Where the card images are
    private static String cardDirectory = "java/cards/";
    private static String outputDirectory = "java/output/";

    // What format to output images in - JPEG may be better if size is an issue
    private static String outputFileType = "png";

    // How many output images to cycle through
    private static int maxImages = 6;

    private static float nonSpecialAlpha = 0.4f;
    private static float criticalAlpha = 0.6f;

    private static HashMap<String, BufferedImage> cardImages = new HashMap<>();
    private static Random rand = new Random();
    private static int imageNumber = 0;
    private static Composite originalComposite;
    private static AlphaComposite alphaComposite = AlphaComposite.getInstance( AlphaComposite.SRC_OVER, nonSpecialAlpha );
    private static AlphaComposite criticalAlphaComposite = AlphaComposite.getInstance( AlphaComposite.SRC_OVER, criticalAlpha );

    public static void main( String[] args ) throws IOException {
        precacheImages();
        generateImage( "Joker,Joker,Ace of Spades,Queen of Hearts,Joker,4 of Hearts", true );
        //generateImage( "Queen of Hearts" );
    }

    public static boolean isCritical( String card, boolean isDesperado ){
        if( isDesperado && card.toLowerCase().equals( "ace of spades" ) ){
            return true;
        }

        return card.toLowerCase().equals( "queen of hearts" );
    }

    /**
     * Loads all images in the cardDirectory folder into cardImages in the format [cardName -> BufferedImage]
     */
    public static void precacheImages() throws IOException {
        File[] files = new File( cardDirectory ).listFiles();
        for( File file : files ){
            String cardName = file.getName().replace( ".png", "" );
            BufferedImage cardImage = ImageIO.read( file );
            cardImages.put( cardName, cardImage );
        }
    }

    /**
     * Generates an image containing a wrapped grid of card images and returns the path to the image
     */
    public static String generateImage( String cards, boolean isDesperado ) throws IOException {

        // Make sure card images have been pre-cached
        if( cardImages.size() == 0 ){
            System.out.println( "Card images were not precached - This may cause a one-time slowdown" );
            precacheImages();
        }

        // Separate the input into separate card names
        String[] cardNames = cards.split( "," );

        // How far each card should be from the its neighbors
        int cardSpacing = Math.max( ( baseImageWidth - cardWidth ) / cardNames.length, cardMinSpacing );

        // The size of the output image
        int extraRowsWidth = (int) Math.floor( ( cardNames.length - 1 ) / wrapAfter ) * rowHorizontalSpacing;
        int imageWidth = cardWidth + (padding * 2 ) + cardSpacing * ( Math.min( wrapAfter, cardNames.length ) - 1 ) + extraRowsWidth;

        int extraRowsHeight = (int) Math.floor( ( cardNames.length - 1 ) / wrapAfter ) * rowVerticalSpacing;
        int imageHeight = cardHeight + (padding * 2 ) + randomHeight + extraRowsHeight;

        BufferedImage img = new BufferedImage( imageWidth, imageHeight, BufferedImage.TYPE_INT_ARGB );

        Graphics2D g = (Graphics2D) img.getGraphics();
        originalComposite = g.getComposite();

        //g.setColor( new Color( 7, 99, 36 ) );
        //g.fillRect( 0, 0, imageWidth, imageHeight );

        for ( int i = 0; i < cardNames.length; i++ ) {

            // Where on a coarse card-sized X,Y grid this card is
            int cardX = i % wrapAfter;
            int cardY = (int) Math.floor( i / wrapAfter );

            String cardName = cardNames[i];

            int x = padding + cardX * cardSpacing + rowHorizontalSpacing * cardY;
            int y = padding + cardY * rowVerticalSpacing;

            y += rand.nextDouble() * randomHeight;

            BufferedImage cardImage = cardImages.get( cardName );
            g.drawImage( cardImage, x, y, cardWidth, cardHeight, null );

            if( isSpecial( cardName ) ){

                // Draw criticals highlighted
                if( isCritical( cardName, isDesperado ) ) {
                    g.setComposite( criticalAlphaComposite );
                    g.drawImage( cardImages.get( "critical" ), x, y, cardWidth, cardHeight, null );
                    g.setComposite( originalComposite );
                }

            }else{
                // Non-special cards are dimmed
                g.setComposite( alphaComposite );
                g.drawImage( cardImages.get( "darkening" ), x, y, cardWidth, cardHeight, null );
                g.setComposite( originalComposite );
            }

        }

        String outputFilePath = outputDirectory + "/" + generateImageName();

        File outputFile = new File( outputFilePath );

        // Create the output directory, if it doesn't exist
        if( !outputFile.exists() ){
            outputFile.mkdirs();
        }

        ImageIO.write( img, outputFileType, new File( outputFilePath ) );

        return outputFilePath;
    }

    private static String generateImageName(){
        imageNumber = ( imageNumber + 1 ) % maxImages;

        return "cards_" + imageNumber + "." + outputFileType;
    }

    private static boolean isSpecial( String cardName ){
        return cardName.contains( "Ace" ) || cardName.contains( "King" ) || cardName.contains( "Queen" ) || cardName.contains( "Jack" ) || cardName.contains( "Joker" );
    }

}