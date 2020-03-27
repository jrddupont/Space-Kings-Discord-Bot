import com.sun.javafx.iio.ImageStorage;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.Random;

public class ImageGeneratorPrimary {
	
	private static int cardWidth = 140;
	private static int cardHeight = 190;
	private static int cardMinSpacing = 36;
	private static int imageWidth = 296;
	private static int importantCardRaiseHeight = 0;
	private static int randomHeight = 10;
	
	public static void main( String[] args ) throws IOException {
		
		if( args.length	!= 1 ){
			//System.out.println( "Please provide a comma separated list of cards in the format \"Ace of Spades, 4 of Clubs\"" );
			//System.exit( 0 );
		}
		

		
	}

	public static boolean hasRunBefore = false;
	public static String generateImage(String cards) throws IOException {
		String[] cardNames;
		if(hasRunBefore){
			cardNames = new String[]{
				"Joker",
				"Joker",
				"Joker",
				"Joker",
				"Joker",
			};
		}else{
			cardNames = new String[]{
				"Joker",
				"5 of Clubs",
				"10 of Spades",
				"King of Clubs",
				"Ace of Spades",
				"7 of Hearts",
				"Ace of Hearts",
				"5 of Clubs",
				"10 of Spades",
				"5 of Clubs",
			};
		}
		hasRunBefore = true;
		//String[] cardNames = args[0].split( "," );
		
			
		int cardSpacing = Math.max( ( imageWidth - cardWidth ) / cardNames.length, cardMinSpacing );
		
		int imageWidth = cardWidth + cardSpacing * (cardNames.length - 1);
		int imageHeight = cardHeight + importantCardRaiseHeight + randomHeight;
		
		BufferedImage img = new BufferedImage( imageWidth, imageHeight, BufferedImage.TYPE_INT_ARGB );
		
		Random rand = new Random();
		
		Graphics2D g = (Graphics2D) img.getGraphics();
		
		for ( int i = 0; i < cardNames.length; i++ ) {
			String cardName = cardNames[i];
			
			BufferedImage cardImage = ImageIO.read( new File( "java/cards/" + cardName + ".png" ) );
			
			int specialRaise = 0;
			if( isSpecial( cardName ) ){
				specialRaise = importantCardRaiseHeight;
			}
			
			int x = i * cardSpacing;
			int y = importantCardRaiseHeight - specialRaise;
			
			y += rand.nextDouble() * randomHeight;
			
			g.drawImage( cardImage, x, y, cardWidth, cardHeight, null );
			
			if( !isSpecial( cardName ) ){
				g.setColor( new Color( 0, 0, 0, 50 ) );
				g.fillRect( x, y, cardWidth, cardHeight );
			}
			
		}
		
		ImageIO.write( img, "png", new File( "java/output/output.png" ) );

		return "java/output/output.png";
	}
	
	private static boolean isSpecial( String cardName ){
		return cardName.contains( "Ace" ) || cardName.contains( "King" ) || cardName.contains( "Queen" ) || cardName.contains( "Jack" ) || cardName.contains( "Joker" );
	}
	
}
